import { useCallback, useEffect, useRef, useState } from "react";
import {
  AZURE_SWITCH_COMMAND_CHUNK_MS,
  AZURE_SWITCH_WAKE_CHUNK_MS,
  cancelAzureMicRecording,
  isAzureMicRecording,
  isAzureMicSupported,
  startAzureMicRecording,
  stopAzureMicRecordingAndTranscribe,
} from "@/lib/onniAzureStt";
import { parseOnniWakePhrase } from "@/lib/onniVoice";

export type AzureMicCallbacks = {
  onCommand: (command: string) => void;
  onWakeWithoutCommand?: () => void;
  onError: (message: string) => void;
};

type ManualMicStatus = "idle" | "recording" | "processing";
type SwitchMicStatus = "idle" | "awaiting_wake" | "recording" | "processing";

type UseOnniAzureMicOptions = {
  /** Switch «Escuchar» — conversación por turnos (independiente del botón mic). */
  switchEnabled?: boolean;
};

/** Tras «Hola Onni» sin pedido, el siguiente turno acepta el comando sin repetir la clave. */
const AZURE_SWITCH_FOLLOW_UP_MS = 30_000;
/** Pausa tras ejecutar un pedido para no grabar la respuesta de Onni. */
const AZURE_SWITCH_POST_COMMAND_MS = 3_200;

function applyAzureTranscript(transcript: string, callbacks: AzureMicCallbacks): boolean {
  const trimmed = transcript.trim();
  if (!trimmed) return false;

  const { heard, command } = parseOnniWakePhrase(trimmed);
  if (heard && command) {
    callbacks.onCommand(command);
    return true;
  }
  if (heard) {
    callbacks.onWakeWithoutCommand?.();
    return true;
  }
  if (trimmed.length > 2) {
    callbacks.onCommand(trimmed);
    return true;
  }
  return false;
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function useOnniAzureMic(
  callbacks: AzureMicCallbacks,
  options: UseOnniAzureMicOptions = {},
) {
  const { switchEnabled = false } = options;
  const [manualStatus, setManualStatus] = useState<ManualMicStatus>("idle");
  const [switchStatus, setSwitchStatus] = useState<SwitchMicStatus>("idle");
  const callbacksRef = useRef(callbacks);
  const switchEnabledRef = useRef(switchEnabled);
  const switchLoopRef = useRef(false);
  const manualActiveRef = useRef(false);
  const followUpUntilRef = useRef(0);
  const lastWakeHandledRef = useRef("");

  callbacksRef.current = callbacks;
  switchEnabledRef.current = switchEnabled;

  const cancel = useCallback(() => {
    switchLoopRef.current = false;
    manualActiveRef.current = false;
    followUpUntilRef.current = 0;
    lastWakeHandledRef.current = "";
    cancelAzureMicRecording();
    setManualStatus("idle");
    setSwitchStatus("idle");
  }, []);

  const finishManualRecording = useCallback(async () => {
    setManualStatus("processing");
    try {
      const transcript = await stopAzureMicRecordingAndTranscribe();
      if (!transcript) return;
      applyAzureTranscript(transcript, callbacksRef.current);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No pude escuchar. Intenta de nuevo.";
      callbacksRef.current.onError(message);
    } finally {
      manualActiveRef.current = false;
      setManualStatus("idle");
    }
  }, []);

  const processSwitchTranscript = useCallback(async (transcript: string) => {
    const trimmed = transcript.trim();
    if (!trimmed) return;

    const inFollowUp = Date.now() < followUpUntilRef.current;

    if (inFollowUp) {
      followUpUntilRef.current = 0;
      if (trimmed.length > 2) {
        callbacksRef.current.onCommand(trimmed);
        await sleep(AZURE_SWITCH_POST_COMMAND_MS);
      }
      return;
    }

    const { heard, command } = parseOnniWakePhrase(trimmed);
    if (!heard) return;

    const signature = `${command}|${trimmed}`;
    if (signature === lastWakeHandledRef.current) return;
    lastWakeHandledRef.current = signature;

    followUpUntilRef.current = Date.now() + AZURE_SWITCH_FOLLOW_UP_MS;

    if (command) {
      callbacksRef.current.onCommand(command);
      await sleep(AZURE_SWITCH_POST_COMMAND_MS);
    } else {
      callbacksRef.current.onWakeWithoutCommand?.();
    }
  }, []);

  const finishSwitchTurn = useCallback(async () => {
    setSwitchStatus("processing");
    try {
      const transcript = await stopAzureMicRecordingAndTranscribe();
      if (!transcript) return;
      await processSwitchTranscript(transcript);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No pude escuchar. Intenta de nuevo.";
      callbacksRef.current.onError(message);
    } finally {
      if (switchEnabledRef.current && !manualActiveRef.current) {
        setSwitchStatus("awaiting_wake");
      } else if (!switchEnabledRef.current) {
        setSwitchStatus("idle");
      }
    }
  }, [processSwitchTranscript]);

  useEffect(() => {
    if (!switchEnabled || !isAzureMicSupported()) {
      switchLoopRef.current = false;
      followUpUntilRef.current = 0;
      lastWakeHandledRef.current = "";
      if (!manualActiveRef.current) {
        cancelAzureMicRecording();
      }
      setSwitchStatus("idle");
      return;
    }

    let cancelled = false;
    switchLoopRef.current = true;
    followUpUntilRef.current = 0;
    lastWakeHandledRef.current = "";
    setSwitchStatus("awaiting_wake");

    void (async () => {
      while (!cancelled && switchEnabledRef.current) {
        if (manualActiveRef.current || isAzureMicRecording()) {
          await sleep(200);
          continue;
        }

        const inFollowUp = Date.now() < followUpUntilRef.current;
        const chunkMs = inFollowUp ? AZURE_SWITCH_COMMAND_CHUNK_MS : AZURE_SWITCH_WAKE_CHUNK_MS;
        setSwitchStatus(inFollowUp ? "recording" : "awaiting_wake");

        const started = await startAzureMicRecording(chunkMs);
        if (!started.ok) {
          if (!manualActiveRef.current) {
            callbacksRef.current.onError(started.error);
          }
          break;
        }

        await sleep(chunkMs + 120);

        if (cancelled || !switchEnabledRef.current || manualActiveRef.current) {
          if (!manualActiveRef.current) {
            cancelAzureMicRecording();
          }
          if (cancelled || !switchEnabledRef.current) break;
          continue;
        }

        if (isAzureMicRecording()) {
          await finishSwitchTurn();
        }

        if (cancelled || !switchEnabledRef.current) break;

        if (Date.now() >= followUpUntilRef.current) {
          setSwitchStatus("awaiting_wake");
        }

        await sleep(inFollowUp ? 450 : 300);
      }

      switchLoopRef.current = false;
      followUpUntilRef.current = 0;
      if (!cancelled && !manualActiveRef.current) {
        setSwitchStatus("idle");
      }
    })();

    return () => {
      cancelled = true;
      switchLoopRef.current = false;
      followUpUntilRef.current = 0;
      lastWakeHandledRef.current = "";
      if (!manualActiveRef.current) {
        cancelAzureMicRecording();
        setSwitchStatus("idle");
      }
    };
  }, [switchEnabled, finishSwitchTurn]);

  const toggle = useCallback(async () => {
    if (manualStatus === "processing") return;

    if (manualStatus === "recording" || (manualActiveRef.current && isAzureMicRecording())) {
      await finishManualRecording();
      return;
    }

    if (!isAzureMicSupported()) {
      callbacksRef.current.onError("Micrófono no disponible en este dispositivo.");
      return;
    }

    cancelAzureMicRecording();
    manualActiveRef.current = true;

    const started = await startAzureMicRecording();
    if (!started.ok) {
      manualActiveRef.current = false;
      callbacksRef.current.onError(started.error);
      return;
    }
    setManualStatus("recording");
  }, [manualStatus, finishManualRecording]);

  return {
    isManualRecording: manualStatus === "recording",
    isManualProcessing: manualStatus === "processing",
    isAwaitingWake: switchEnabled && switchStatus === "awaiting_wake",
    isSwitchListening: switchEnabled && switchStatus !== "idle",
    isSwitchProcessing: switchEnabled && switchStatus === "processing",
    toggle,
    cancel,
    isSupported: isAzureMicSupported(),
  };
}
