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

export type AzureMicStatus = "idle" | "awaiting_wake" | "recording" | "processing";

type UseOnniAzureMicOptions = {
  /** Switch «Escuchar» — conversación por turnos; desactiva el botón mic. */
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
  const [status, setStatus] = useState<AzureMicStatus>("idle");
  const callbacksRef = useRef(callbacks);
  const switchEnabledRef = useRef(switchEnabled);
  const switchLoopRef = useRef(false);
  const followUpUntilRef = useRef(0);
  const lastWakeHandledRef = useRef("");

  callbacksRef.current = callbacks;
  switchEnabledRef.current = switchEnabled;

  const cancel = useCallback(() => {
    switchLoopRef.current = false;
    followUpUntilRef.current = 0;
    lastWakeHandledRef.current = "";
    cancelAzureMicRecording();
    setStatus("idle");
  }, []);

  const finishRecordingTurn = useCallback(async () => {
    setStatus("processing");
    try {
      const transcript = await stopAzureMicRecordingAndTranscribe();
      if (!transcript) return;
      applyAzureTranscript(transcript, callbacksRef.current);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No pude escuchar. Intenta de nuevo.";
      callbacksRef.current.onError(message);
    } finally {
      if (!switchEnabledRef.current) {
        setStatus("idle");
      }
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
    setStatus("processing");
    try {
      const transcript = await stopAzureMicRecordingAndTranscribe();
      if (!transcript) return;
      await processSwitchTranscript(transcript);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No pude escuchar. Intenta de nuevo.";
      callbacksRef.current.onError(message);
    }
  }, [processSwitchTranscript]);

  useEffect(() => {
    if (!switchEnabled || !isAzureMicSupported()) {
      switchLoopRef.current = false;
      followUpUntilRef.current = 0;
      lastWakeHandledRef.current = "";
      cancelAzureMicRecording();
      if (!switchEnabled) setStatus("idle");
      return;
    }

    let cancelled = false;
    switchLoopRef.current = true;
    followUpUntilRef.current = 0;
    lastWakeHandledRef.current = "";

    void (async () => {
      while (!cancelled && switchEnabledRef.current) {
        if (isAzureMicRecording()) {
          await sleep(200);
          continue;
        }

        const inFollowUp = Date.now() < followUpUntilRef.current;
        const chunkMs = inFollowUp ? AZURE_SWITCH_COMMAND_CHUNK_MS : AZURE_SWITCH_WAKE_CHUNK_MS;
        setStatus(inFollowUp ? "recording" : "awaiting_wake");

        const started = await startAzureMicRecording(chunkMs);
        if (!started.ok) {
          callbacksRef.current.onError(started.error);
          break;
        }

        await sleep(chunkMs + 120);

        if (cancelled || !switchEnabledRef.current) {
          cancelAzureMicRecording();
          break;
        }

        if (isAzureMicRecording()) {
          await finishSwitchTurn();
        }

        if (cancelled || !switchEnabledRef.current) break;

        if (Date.now() >= followUpUntilRef.current) {
          setStatus("awaiting_wake");
        }

        await sleep(inFollowUp ? 450 : 300);
      }

      switchLoopRef.current = false;
      followUpUntilRef.current = 0;
      if (!cancelled) setStatus("idle");
    })();

    return () => {
      cancelled = true;
      switchLoopRef.current = false;
      followUpUntilRef.current = 0;
      lastWakeHandledRef.current = "";
      cancelAzureMicRecording();
      setStatus("idle");
    };
  }, [switchEnabled, finishSwitchTurn]);

  const toggle = useCallback(async () => {
    if (switchEnabledRef.current) return;
    if (status === "processing") return;

    if (status === "recording" || status === "awaiting_wake" || isAzureMicRecording()) {
      await finishRecordingTurn();
      setStatus("idle");
      return;
    }

    if (!isAzureMicSupported()) {
      callbacksRef.current.onError("Micrófono no disponible en este dispositivo.");
      return;
    }

    const started = await startAzureMicRecording();
    if (!started.ok) {
      callbacksRef.current.onError(started.error);
      return;
    }
    setStatus("recording");
  }, [status, finishRecordingTurn]);

  return {
    status,
    isRecording: status === "recording" || status === "awaiting_wake",
    isAwaitingWake: status === "awaiting_wake",
    isProcessing: status === "processing",
    isSwitchActive: switchEnabled,
    toggle,
    cancel,
    isSupported: isAzureMicSupported(),
  };
}
