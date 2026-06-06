import { useCallback, useState } from "react";
import {
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

export function useOnniAzureMic() {
  const [status, setStatus] = useState<AzureMicStatus>("idle");

  const toggle = useCallback(async (callbacks: AzureMicCallbacks) => {
    if (status === "processing") return;

    if (status === "recording" || isAzureMicRecording()) {
      setStatus("processing");
      try {
        const transcript = await stopAzureMicRecordingAndTranscribe();
        if (!transcript) {
          callbacks.onError("No escuché nada. Di «Hola Onni» y tu pedido.");
          return;
        }

        const { heard, command } = parseOnniWakePhrase(transcript);
        if (heard && command) {
          callbacks.onCommand(command);
          return;
        }
        if (heard) {
          callbacks.onWakeWithoutCommand?.();
          return;
        }
        if (transcript.length > 2) {
          callbacks.onCommand(transcript);
          return;
        }
        callbacks.onError("Di «Hola Onni, llévame a…» en una frase.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "No pude escuchar. Intenta de nuevo.";
        callbacks.onError(message);
      } finally {
        setStatus("idle");
      }
      return;
    }

    if (!isAzureMicSupported()) {
      callbacks.onError("Micrófono no disponible en este dispositivo.");
      return;
    }

    const started = await startAzureMicRecording();
    if (!started.ok) {
      callbacks.onError(started.error);
      return;
    }
    setStatus("recording");
  }, [status]);

  const cancel = useCallback(() => {
    cancelAzureMicRecording();
    setStatus("idle");
  }, []);

  return {
    status,
    isRecording: status === "recording",
    isProcessing: status === "processing",
    toggle,
    cancel,
    isSupported: isAzureMicSupported(),
  };
}
