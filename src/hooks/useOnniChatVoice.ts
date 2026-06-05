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
import { onniMicDeniedMessage, requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";
import { startWebVoiceCapture } from "@/lib/onniWebVoiceCapture";

type VoiceCaptureCallbacks = {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onFallbackToNative?: () => void;
};

const NATIVE_RESTART_MS = 450;
const NATIVE_SOFT_ERROR_CODES = new Set(["no_match", "speech_timeout", "busy"]);

export function useOnniChatVoice() {
  const [voiceMode, setVoiceMode] = useState<OnniVoiceMode>(() => getOnniVoiceMode());
  const voiceModeRef = useRef(voiceMode);
  const [voiceListening, setVoiceListening] = useState(false);
  const stopWebCaptureRef = useRef<(() => void) | null>(null);
  const pendingTranscriptRef = useRef("");
  const captureCallbacksRef = useRef<VoiceCaptureCallbacks | null>(null);
  const captureActiveRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const usesContinuousMic = voiceMode === "native";

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  const clearNativeRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const scheduleNativeRestart = useCallback(() => {
    clearNativeRestartTimer();
    if (!captureActiveRef.current || voiceModeRef.current !== "native") return;
    restartTimerRef.current = setTimeout(() => {
      if (!captureActiveRef.current || voiceModeRef.current !== "native") return;
      try {
        startNativeVoiceListening();
        setVoiceListening(true);
      } catch {
        captureActiveRef.current = false;
        setVoiceListening(false);
        captureCallbacksRef.current?.onError("No se pudo reactivar el micrófono.");
      }
    }, NATIVE_RESTART_MS);
  }, [clearNativeRestartTimer]);

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
    captureActiveRef.current = false;
    clearNativeRestartTimer();

    if (voiceModeRef.current === "web") {
      stopWebCaptureRef.current?.();
      stopWebCaptureRef.current = null;
      setVoiceListening(false);
      return pendingTranscriptRef.current.trim();
    }

    stopNativeVoiceListening();
    setVoiceListening(false);
    return "";
  }, [clearNativeRestartTimer]);

  const beginNativeCapture = useCallback(async (callbacks: VoiceCaptureCallbacks): Promise<boolean> => {
    const micPermission = await requestOnniMicrophoneAccess();
    if (micPermission === "denied") {
      callbacks.onError(onniMicDeniedMessage());
      return false;
    }
    if (micPermission === "unsupported") {
      callbacks.onError("Este dispositivo no soporta micrófono para Onni.");
      return false;
    }

    captureActiveRef.current = true;
    if (!startNativeVoiceListening()) {
      captureActiveRef.current = false;
      callbacks.onError("No se pudo iniciar el micrófono nativo.");
      return false;
    }
    setVoiceListening(true);
    return true;
  }, []);

  const startVoiceCapture = useCallback(
    (callbacks: VoiceCaptureCallbacks) => {
      captureCallbacksRef.current = callbacks;
      pendingTranscriptRef.current = "";

      if (voiceModeRef.current === "native") {
        void beginNativeCapture(callbacks);
        return true;
      }

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
              void beginNativeCapture(callbacks);
              return;
            }
            callbacks.onError(message);
          },
        });

        if (!stop) {
          if (switchToNativeVoice()) {
            callbacks.onFallbackToNative?.();
            void beginNativeCapture(callbacks);
            return true;
          }
          callbacks.onError("Tu navegador no soporta reconocimiento de voz.");
          return false;
        }
        stopWebCaptureRef.current = stop;
        return true;
      }

      callbacks.onError("No encuentro voz disponible en este dispositivo.");
      return false;
    },
    [beginNativeCapture, switchToNativeVoice],
  );

  const toggleVoiceCapture = useCallback(
    async (callbacks: VoiceCaptureCallbacks) => {
      captureCallbacksRef.current = callbacks;

      if (captureActiveRef.current || voiceListening) {
        stopVoiceCapture();
        return false;
      }

      pendingTranscriptRef.current = "";

      if (voiceModeRef.current === "native") {
        return beginNativeCapture(callbacks);
      }

      return startVoiceCapture(callbacks);
    },
    [beginNativeCapture, startVoiceCapture, stopVoiceCapture, voiceListening],
  );

  useEffect(() => {
    if (!isNativeVoiceAvailable()) return;

    const onVoiceStart = () => {
      if (voiceModeRef.current !== "native") return;
      if (!captureActiveRef.current) pendingTranscriptRef.current = "";
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

      const transcript = pendingTranscriptRef.current.trim();
      pendingTranscriptRef.current = "";
      if (transcript) captureCallbacksRef.current?.onTranscript(transcript);

      if (!captureActiveRef.current) {
        setVoiceListening(false);
        return;
      }

      setVoiceListening(true);
      scheduleNativeRestart();
    };

    const onVoiceError = (event: Event) => {
      if (voiceModeRef.current !== "native") return;

      const custom = event as CustomEvent<unknown>;
      let message = "No se pudo activar la voz nativa en este momento.";
      let code = "";
      if (typeof custom.detail === "string") message = custom.detail;
      else if (custom.detail && typeof custom.detail === "object") {
        const payload = custom.detail as { message?: string; code?: string };
        code = payload.code?.trim() ?? "";
        if (payload.message?.trim()) message = payload.message.trim();
        else if (code) message = `Error de voz: ${code}`;
      }

      pendingTranscriptRef.current = "";

      if (captureActiveRef.current && NATIVE_SOFT_ERROR_CODES.has(code)) {
        scheduleNativeRestart();
        return;
      }

      captureActiveRef.current = false;
      clearNativeRestartTimer();
      setVoiceListening(false);
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
  }, [clearNativeRestartTimer, scheduleNativeRestart]);

  useEffect(
    () => () => {
      captureActiveRef.current = false;
      clearNativeRestartTimer();
      stopWebCaptureRef.current?.();
      stopNativeVoiceListening();
      stopWebVoice();
    },
    [clearNativeRestartTimer],
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
    toggleVoiceCapture,
    usesContinuousMic,
    canListen: voiceMode !== "none",
    canSpeak: voiceMode !== "none",
    voiceLabel,
  };
};
