import { useCallback, useEffect, useRef, useState } from "react";
import { isDesktopWebBrowser } from "@/lib/deviceDetection";
import { parseNativeVoiceErrorDetail, isNativeVoiceSoftError } from "@/lib/onniNativeVoiceErrors";
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
import { parseOnniWakePhrase } from "@/lib/onniVoice";
import { onniMicDeniedMessage, requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";
import { startWebVoiceCapture } from "@/lib/onniWebVoiceCapture";

type VoiceCaptureCallbacks = {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onFallbackToNative?: () => void;
};

export type NativeWakeCallbacks = {
  onWake: (command: string) => void;
  onWakeWithoutCommand?: () => void;
  onError?: (message: string) => void;
};

const NATIVE_RESTART_MS = 650;

export function useOnniChatVoice() {
  const [voiceMode, setVoiceMode] = useState<OnniVoiceMode>(() => getOnniVoiceMode());
  const voiceModeRef = useRef(voiceMode);
  const [voiceListening, setVoiceListening] = useState(false);
  const [nativeWakeListening, setNativeWakeListening] = useState(false);
  const [voiceCaptureActive, setVoiceCaptureActive] = useState(false);
  const stopWebCaptureRef = useRef<(() => void) | null>(null);
  const pendingTranscriptRef = useRef("");
  const captureCallbacksRef = useRef<VoiceCaptureCallbacks | null>(null);
  const wakeCallbacksRef = useRef<NativeWakeCallbacks | null>(null);
  const captureActiveRef = useRef(false);
  const wakeActiveRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWakeHandledRef = useRef("");

  const usesContinuousMic = voiceMode === "native";
  const supportsNativeWakeSwitch = usesContinuousMic;

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  const isNativeSessionActive = useCallback(
    () => captureActiveRef.current || wakeActiveRef.current,
    [],
  );

  const clearNativeRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const scheduleNativeRestart = useCallback(() => {
    clearNativeRestartTimer();
    if (!isNativeSessionActive() || voiceModeRef.current !== "native") return;
    restartTimerRef.current = setTimeout(() => {
      if (!isNativeSessionActive() || voiceModeRef.current !== "native") return;
      try {
        startNativeVoiceListening();
        setVoiceListening(true);
        if (wakeActiveRef.current) setNativeWakeListening(true);
      } catch {
        captureActiveRef.current = false;
        wakeActiveRef.current = false;
        setVoiceCaptureActive(false);
        setVoiceListening(false);
        setNativeWakeListening(false);
        captureCallbacksRef.current?.onError("No se pudo reactivar el micrófono.");
        wakeCallbacksRef.current?.onError?.("No se pudo reactivar el micrófono.");
      }
    }, NATIVE_RESTART_MS);
  }, [clearNativeRestartTimer, isNativeSessionActive]);

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
    const wasCapturing = captureActiveRef.current;
    captureActiveRef.current = false;
    if (wasCapturing) setVoiceCaptureActive(false);
    clearNativeRestartTimer();

      if (voiceModeRef.current === "web") {
        stopWebCaptureRef.current?.();
        stopWebCaptureRef.current = null;
        setVoiceCaptureActive(false);
        setVoiceListening(false);
        return pendingTranscriptRef.current.trim();
      }

    if (!wakeActiveRef.current) {
      stopNativeVoiceListening();
      setVoiceListening(false);
    } else {
      setVoiceListening(true);
      setNativeWakeListening(true);
      scheduleNativeRestart();
    }
    return "";
  }, [clearNativeRestartTimer, scheduleNativeRestart]);

  const stopNativeWakeListening = useCallback(() => {
    wakeActiveRef.current = false;
    setNativeWakeListening(false);
    lastWakeHandledRef.current = "";
    clearNativeRestartTimer();

    if (!captureActiveRef.current) {
      stopNativeVoiceListening();
      setVoiceListening(false);
      return;
    }

    setVoiceListening(true);
    scheduleNativeRestart();
  }, [clearNativeRestartTimer, scheduleNativeRestart]);

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
    setVoiceCaptureActive(true);
    if (!startNativeVoiceListening()) {
      captureActiveRef.current = false;
      setVoiceCaptureActive(false);
      callbacks.onError("No se pudo iniciar el micrófono nativo.");
      return false;
    }
    setVoiceListening(true);
    return true;
  }, []);

  const startNativeWakeListening = useCallback(
    async (callbacks: NativeWakeCallbacks): Promise<boolean> => {
      if (voiceModeRef.current !== "native") return false;
      if (wakeActiveRef.current) {
        wakeCallbacksRef.current = callbacks;
        return true;
      }

      wakeCallbacksRef.current = callbacks;
      lastWakeHandledRef.current = "";

      const micPermission = await requestOnniMicrophoneAccess();
      if (micPermission === "denied") {
        callbacks.onError?.(onniMicDeniedMessage());
        return false;
      }
      if (micPermission === "unsupported") {
        callbacks.onError?.("Este dispositivo no soporta micrófono para Onni.");
        return false;
      }

      wakeActiveRef.current = true;
      setNativeWakeListening(true);

      if (!startNativeVoiceListening()) {
        wakeActiveRef.current = false;
        setNativeWakeListening(false);
        callbacks.onError?.("No se pudo iniciar el micrófono nativo.");
        return false;
      }

      setVoiceListening(true);
      return true;
    },
    [],
  );

  const handleNativeTranscript = useCallback((text: string, isFinal: boolean) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (captureActiveRef.current) {
      if (isFinal) {
        pendingTranscriptRef.current = "";
        captureCallbacksRef.current?.onTranscript(trimmed);
      } else {
        pendingTranscriptRef.current = trimmed;
      }
      return;
    }

    if (!wakeActiveRef.current) return;

    if (!isFinal) {
      pendingTranscriptRef.current = trimmed;
      return;
    }

    pendingTranscriptRef.current = "";
    const { heard, command } = parseOnniWakePhrase(trimmed);
    if (!heard) return;

    const signature = `${command}|${trimmed}`;
    if (signature === lastWakeHandledRef.current) return;
    lastWakeHandledRef.current = signature;

    if (!command) {
      wakeCallbacksRef.current?.onWakeWithoutCommand?.();
      return;
    }
    wakeCallbacksRef.current?.onWake(command);
  }, []);

  const startVoiceCapture = useCallback(
    (callbacks: VoiceCaptureCallbacks) => {
      captureCallbacksRef.current = callbacks;
      if (!captureActiveRef.current) pendingTranscriptRef.current = "";

      if (voiceModeRef.current === "native") {
        void beginNativeCapture(callbacks);
        return true;
      }

      if (voiceModeRef.current === "web") {
        stopWebCaptureRef.current?.();
        const stop = startWebVoiceCapture({
          onStart: () => {
            setVoiceCaptureActive(true);
            setVoiceListening(true);
          },
          onPartial: (text) => {
            pendingTranscriptRef.current = text;
          },
          onFinal: (text) => {
            pendingTranscriptRef.current = text;
          },
          onEnd: () => {
            setVoiceCaptureActive(false);
            setVoiceListening(false);
            stopWebCaptureRef.current = null;
            const transcript = pendingTranscriptRef.current.trim();
            pendingTranscriptRef.current = "";
            if (transcript) callbacks.onTranscript(transcript);
          },
          onError: (message) => {
            setVoiceCaptureActive(false);
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

      if (captureActiveRef.current) {
        stopVoiceCapture();
        return false;
      }

      pendingTranscriptRef.current = "";

      if (voiceModeRef.current === "native") {
        return beginNativeCapture(callbacks);
      }

      return startVoiceCapture(callbacks);
    },
    [beginNativeCapture, startVoiceCapture, stopVoiceCapture],
  );

  useEffect(() => {
    if (!isNativeVoiceAvailable()) return;

    const onVoiceStart = () => {
      if (voiceModeRef.current !== "native") return;
      if (!isNativeSessionActive()) pendingTranscriptRef.current = "";
      setVoiceListening(true);
      if (wakeActiveRef.current) setNativeWakeListening(true);
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
      handleNativeTranscript(text, isFinal);
    };

    const onVoiceEnd = () => {
      if (voiceModeRef.current !== "native") return;

      const transcript = pendingTranscriptRef.current.trim();
      pendingTranscriptRef.current = "";
      if (transcript) handleNativeTranscript(transcript, true);

      if (!isNativeSessionActive()) {
        setVoiceListening(false);
        setNativeWakeListening(false);
        return;
      }

      setVoiceListening(true);
      if (wakeActiveRef.current) setNativeWakeListening(true);
      scheduleNativeRestart();
    };

    const onVoiceError = (event: Event) => {
      if (voiceModeRef.current !== "native") return;

      const custom = event as CustomEvent<unknown>;
      const { code, message } = parseNativeVoiceErrorDetail(custom.detail);
      pendingTranscriptRef.current = "";

      if (isNativeSessionActive() && (isNativeVoiceSoftError(code) || message === null)) {
        scheduleNativeRestart();
        return;
      }

      captureActiveRef.current = false;
      wakeActiveRef.current = false;
      setVoiceCaptureActive(false);
      clearNativeRestartTimer();
      setVoiceListening(false);
      setNativeWakeListening(false);

      const userMessage = message ?? "No pude escuchar. Intenta de nuevo.";
      captureCallbacksRef.current?.onError(userMessage);
      wakeCallbacksRef.current?.onError?.(userMessage);
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
  }, [clearNativeRestartTimer, handleNativeTranscript, isNativeSessionActive, scheduleNativeRestart]);

  useEffect(
    () => () => {
      captureActiveRef.current = false;
      wakeActiveRef.current = false;
      setVoiceCaptureActive(false);
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
    nativeWakeListening,
    voiceCaptureActive,
    setVoiceListening,
    speakAnswer,
    startVoiceCapture,
    stopVoiceCapture,
    toggleVoiceCapture,
    startNativeWakeListening,
    stopNativeWakeListening,
    usesContinuousMic,
    supportsNativeWakeSwitch,
    canListen: voiceMode !== "none",
    canSpeak: voiceMode !== "none",
    voiceLabel,
  };
};
