import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getOnniVoiceMode,
  speakOnniAnswer,
  stopWebVoice,
  type OnniVoiceMode,
} from "@/lib/onniVoiceRuntime";
import { startWebVoiceCapture } from "@/lib/onniWebVoiceCapture";

export function useOnniChatVoice() {
  const voiceMode = useMemo(() => getOnniVoiceMode(), []);
  const [voiceListening, setVoiceListening] = useState(false);
  const stopWebCaptureRef = useRef<(() => void) | null>(null);
  const pendingTranscriptRef = useRef("");

  const speakAnswer = useCallback(
    (text: string) => {
      speakOnniAnswer(text, voiceMode);
    },
    [voiceMode],
  );

  const stopVoiceCapture = useCallback(() => {
    if (voiceMode === "web") {
      stopWebCaptureRef.current?.();
      stopWebCaptureRef.current = null;
      setVoiceListening(false);
      return pendingTranscriptRef.current.trim();
    }
    return "";
  }, [voiceMode]);

  const startVoiceCaptureWeb = useCallback(
    (onFinal: (transcript: string) => void, onError: (message: string) => void) => {
      pendingTranscriptRef.current = "";
      stopWebCaptureRef.current?.();

      const stop = startWebVoiceCapture({
        onStart: () => setVoiceListening(true),
        onPartial: (text) => {
          pendingTranscriptRef.current = text;
        },
        onFinal: (text) => {
          pendingTranscriptRef.current = text;
        },
        onEnd: () => {
          setVoiceListening(false);
          stopWebCaptureRef.current = null;
          const transcript = pendingTranscriptRef.current.trim();
          pendingTranscriptRef.current = "";
          if (transcript) onFinal(transcript);
        },
        onError: (message) => {
          setVoiceListening(false);
          stopWebCaptureRef.current = null;
          pendingTranscriptRef.current = "";
          onError(message);
        },
      });

      if (!stop) return false;
      stopWebCaptureRef.current = stop;
      return true;
    },
    [],
  );

  useEffect(
    () => () => {
      stopWebCaptureRef.current?.();
      stopWebVoice();
    },
    [],
  );

  const voiceLabel =
    voiceMode === "web"
      ? "Voz del navegador"
      : voiceMode === "native"
        ? "Voz nativa Android"
        : "Voz no disponible";

  return {
    voiceMode,
    voiceListening,
    setVoiceListening,
    speakAnswer,
    startVoiceCaptureWeb,
    stopVoiceCapture,
    canListen: voiceMode !== "none",
    canSpeak: voiceMode !== "none",
    voiceLabel,
  };
}
