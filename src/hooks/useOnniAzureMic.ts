import { useCallback, useEffect, useRef, useState } from "react";
import {
  AZURE_SWITCH_CHUNK_MS,
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

export type AzureMicStatus = "idle" | "recording" | "processing";

type UseOnniAzureMicOptions = {
  /** Switch «Escuchar» — conversación por turnos; desactiva el botón mic. */
  switchEnabled?: boolean;
};

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

  callbacksRef.current = callbacks;
  switchEnabledRef.current = switchEnabled;

  const cancel = useCallback(() => {
    switchLoopRef.current = false;
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

  useEffect(() => {
    if (!switchEnabled || !isAzureMicSupported()) {
      switchLoopRef.current = false;
      cancelAzureMicRecording();
      if (!switchEnabled) setStatus("idle");
      return;
    }

    let cancelled = false;
    switchLoopRef.current = true;

    void (async () => {
      while (!cancelled && switchEnabledRef.current) {
        if (isAzureMicRecording()) {
          await sleep(200);
          continue;
        }

        const started = await startAzureMicRecording(AZURE_SWITCH_CHUNK_MS);
        if (!started.ok) {
          callbacksRef.current.onError(started.error);
          break;
        }
        setStatus("recording");

        await sleep(AZURE_SWITCH_CHUNK_MS + 120);

        if (cancelled || !switchEnabledRef.current) {
          cancelAzureMicRecording();
          break;
        }

        if (isAzureMicRecording()) {
          await finishRecordingTurn();
        }

        if (cancelled || !switchEnabledRef.current) break;
        await sleep(450);
      }

      switchLoopRef.current = false;
      if (!cancelled) setStatus("idle");
    })();

    return () => {
      cancelled = true;
      switchLoopRef.current = false;
      cancelAzureMicRecording();
      setStatus("idle");
    };
  }, [switchEnabled, finishRecordingTurn]);

  const toggle = useCallback(async () => {
    if (switchEnabledRef.current) return;
    if (status === "processing") return;

    if (status === "recording" || isAzureMicRecording()) {
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
    isRecording: status === "recording",
    isProcessing: status === "processing",
    isSwitchActive: switchEnabled,
    toggle,
    cancel,
    isSupported: isAzureMicSupported(),
  };
}
