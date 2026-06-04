import { useCallback, useEffect, useRef, useState } from "react";
import { isDesktopWebBrowser } from "@/lib/deviceDetection";
import {
  getOnniVoiceMode,
  isNativeVoiceAvailable,
  markPreferNativeVoice,
  speakOnniAnswer,
  startNativeVoiceListening,
  stopNativeVoiceListening,
  stopWebVoice,
  type OnniVoiceMode,
} from "@/lib/onniVoiceRuntime";
import { startWebVoiceCapture } from "@/lib/onniWebVoiceCapture";

type VoiceCaptureCallbacks = {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onFallbackToNative?: () => void;
};

export function useOnniChatVoice() {
  const [voiceMode, setVoiceMode] = useState<OnniVoiceMode>(() => getOnniVoiceMode());
  const voiceModeRef = useRef(voiceMode);
  const [voiceListening, setVoiceListening] = useState(false);
  const stopWebCaptureRef = useRef<(() => void) | null>(null);
  const pendingTranscriptRef = useRef("");
  const captureCallbacksRef = useRef<VoiceCaptureCallbacks | null>(null);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  const switchToNativeVoice = useCallback(() => {
    if (isDesktopWebBrowser()) return false;
    if (!isNativeVoiceAvailable()) return false;
    markPreferNativeVoice();
    setVoiceMode("native");
    return true;
  }, []);

  const speakAnswer = useCallback(
    (text: string) => {
      speakOnniAnswer(text, voiceMode, () => {
        if (switchToNativeVoice()) {
          /* speakOnniAnswer ya reprodujo con nativa en el callback */
        }
      });
    },
    [voiceMode, switchToNativeVoice],
  );

  const stopVoiceCapture = useCallback(() => {
    if (voiceModeRef.current === "web") {
      stopWebCaptureRef.current?.();
      stopWebCaptureRef.current = null;
      setVoiceListening(false);
      return pendingTranscriptRef.current.trim();
    }
    stopNativeVoiceListening();
    setVoiceListening(false);
    return "";
  }, []);

  const startVoiceCapture = useCallback(
    (callbacks: VoiceCaptureCallbacks) => {
      captureCallbacksRef.current = callbacks;
      pendingTranscriptRef.current = "";

      if (voiceModeRef.current === "web") {
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
            if (transcript) callbacks.onTranscript(transcript);
          },
          onError: (message) => {
            setVoiceListening(false);
            stopWebCaptureRef.current = null;
            pendingTranscriptRef.current = "";
            if (switchToNativeVoice()) {
              callbacks.onFallbackToNative?.();
              if (startNativeVoiceListening()) return;
            }
            callbacks.onError(message);
          },
        });

        if (!stop) {
          if (switchToNativeVoice()) {
            callbacks.onFallbackToNative?.();
            if (startNativeVoiceListening()) return true;
          }
          callbacks.onError("Tu navegador no soporta reconocimiento de voz.");
          return false;
        }
        stopWebCaptureRef.current = stop;
        return true;
      }

      if (!startNativeVoiceListening()) {
        callbacks.onError("No encuentro voz disponible en este dispositivo.");
        return false;
      }
      return true;
    },
    [switchToNativeVoice],
  );

  useEffect(() => {
    if (!isNativeVoiceAvailable()) return;

    const onVoiceStart = () => {
      if (voiceModeRef.current !== "native") return;
      pendingTranscriptRef.current = "";
      setVoiceListening(true);
    };

    const onVoiceResult = (event: Event) => {
      if (voiceModeRef.current !== "native") return;
      const custom = event as CustomEvent<unknown>;
      const detail = custom.detail;
      let text = "";
      let isFinal = true;
      if (typeof detail === "string") {
        text = detail.trim();
      } else if (detail && typeof detail === "object") {
        const payload = detail as { text?: string; transcript?: string; final?: boolean; isFinal?: boolean };
        text =
          typeof payload.text === "string"
            ? payload.text.trim()
            : typeof payload.transcript === "string"
              ? payload.transcript.trim()
              : "";
        isFinal =
          typeof payload.isFinal === "boolean"
            ? payload.isFinal
            : typeof payload.final === "boolean"
              ? payload.final
              : true;
      }
      if (!text) return;
      pendingTranscriptRef.current = text;
      if (isFinal) {
        pendingTranscriptRef.current = "";
        captureCallbacksRef.current?.onTranscript(text);
      }
    };

    const onVoiceEnd = () => {
      if (voiceModeRef.current !== "native") return;
      setVoiceListening(false);
      const transcript = pendingTranscriptRef.current.trim();
      pendingTranscriptRef.current = "";
      if (transcript) captureCallbacksRef.current?.onTranscript(transcript);
    };

    const onVoiceError = (event: Event) => {
      if (voiceModeRef.current !== "native") return;
      setVoiceListening(false);
      pendingTranscriptRef.current = "";
      const custom = event as CustomEvent<unknown>;
      let message = "No se pudo activar la voz nativa en este momento.";
      if (typeof custom.detail === "string") message = custom.detail;
      else if (custom.detail && typeof custom.detail === "object") {
        const payload = custom.detail as { message?: string; code?: string };
        if (payload.message?.trim()) message = payload.message.trim();
        else if (payload.code?.trim()) message = `Error de voz: ${payload.code.trim()}`;
      }
      captureCallbacksRef.current?.onError(message);
    };

    window.addEventListener("voice:start", onVoiceStart);
    window.addEventListener("voice:result", onVoiceResult);
    window.addEventListener("voice:end", onVoiceEnd);
    window.addEventListener("voice:error", onVoiceError);
    return () => {
      window.removeEventListener("voice:start", onVoiceStart);
      window.removeEventListener("voice:result", onVoiceResult);
      window.removeEventListener("voice:end", onVoiceEnd);
      window.removeEventListener("voice:error", onVoiceError);
    };
  }, []);

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
    startVoiceCapture,
    stopVoiceCapture,
    canListen: voiceMode !== "none",
    canSpeak: voiceMode !== "none",
    voiceLabel,
  };
}
