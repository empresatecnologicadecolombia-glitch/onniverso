import { isDesktopWebBrowser } from "@/lib/deviceDetection";
import { isOnniVoiceSupported, pickOnniSpanishVoice } from "@/lib/onniVoice";

export type OnniVoiceMode = "web" | "native" | "none";

const ONNI_VOICE_USE_NATIVE_KEY = "onniverso.onni.voiceUseNative";

type NativeVoiceBridge = {
  startListening?: () => void;
  stopListening?: () => void;
  speak?: (text: string) => void;
  stopSpeaking?: () => void;
};

export function getNativeVoiceBridge(): NativeVoiceBridge | null {
  if (typeof window === "undefined") return null;
  const android = window.Android;
  if (android && (typeof android.startListening === "function" || typeof android.speak === "function")) {
    return android;
  }
  const bridge = window.AndroidBridge as NativeVoiceBridge | undefined;
  if (bridge && (typeof bridge.startListening === "function" || typeof bridge.speak === "function")) {
    return bridge;
  }
  return null;
}

export function isNativeVoiceAvailable(): boolean {
  const native = getNativeVoiceBridge();
  return typeof native?.speak === "function" && typeof native?.startListening === "function";
}

export function prefersNativeVoiceFallback(): boolean {
  try {
    return sessionStorage.getItem(ONNI_VOICE_USE_NATIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPreferNativeVoice(): void {
  if (isDesktopWebBrowser()) return;
  try {
    sessionStorage.setItem(ONNI_VOICE_USE_NATIVE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Escritorio: voz del navegador (sin cambios respecto a la versión que ya funcionaba).
 * Móvil/APK: voz del navegador primero; si falla en la sesión, nativa.
 */
export function getOnniVoiceMode(): OnniVoiceMode {
  if (isDesktopWebBrowser() && isOnniVoiceSupported()) return "web";
  if (prefersNativeVoiceFallback() && isNativeVoiceAvailable()) return "native";
  if (isOnniVoiceSupported()) return "web";
  if (isNativeVoiceAvailable()) return "native";
  return "none";
}

export function startNativeVoiceListening(): boolean {
  const bridge = getNativeVoiceBridge();
  if (typeof bridge?.startListening !== "function") return false;
  try {
    bridge.startListening();
    return true;
  } catch {
    return false;
  }
}

export function stopNativeVoiceListening(): void {
  try {
    getNativeVoiceBridge()?.stopListening?.();
  } catch {
    /* ignore */
  }
}

let cachedWebVoice: SpeechSynthesisVoice | null = null;

function ensureWebSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return cachedWebVoice;
  cachedWebVoice = pickOnniSpanishVoice(voices);
  return cachedWebVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    ensureWebSpanishVoice();
  };
}

export function speakWithWebVoice(text: string, onFailed?: () => void): boolean {
  if (!isOnniVoiceSupported() || !text.trim()) return false;
  const clean = text.replace(/\n+/g, ". ").trim();
  if (!clean) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = ensureWebSpanishVoice();
  utterance.lang = voice?.lang ?? "es-CO";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  if (voice) utterance.voice = voice;
  utterance.onerror = () => onFailed?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopWebVoice(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakWithNativeVoice(text: string): boolean {
  const bridge = getNativeVoiceBridge();
  if (typeof bridge?.speak !== "function") return false;
  try {
    bridge.stopSpeaking?.();
    bridge.speak(text);
    return true;
  } catch {
    return false;
  }
}

export function speakOnniAnswer(
  text: string,
  mode: OnniVoiceMode,
  onPreferNative?: () => void,
): boolean {
  if (mode === "web") {
    if (isDesktopWebBrowser()) {
      return speakWithWebVoice(text);
    }
    const fallback = () => {
      if (!isNativeVoiceAvailable()) return;
      markPreferNativeVoice();
      onPreferNative?.();
      speakWithNativeVoice(text);
    };
    const started = speakWithWebVoice(text, fallback);
    if (!started && isNativeVoiceAvailable()) {
      fallback();
      return true;
    }
    return started;
  }
  if (mode === "native") return speakWithNativeVoice(text);
  return false;
}
