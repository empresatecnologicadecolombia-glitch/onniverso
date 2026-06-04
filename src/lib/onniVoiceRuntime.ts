import { isDesktopWebBrowser } from "@/lib/deviceDetection";
import { isOnniVoiceSupported, pickOnniSpanishVoice } from "@/lib/onniVoice";

export type OnniVoiceMode = "web" | "native" | "none";

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

/** Escritorio → voz del navegador; APK Android → puente nativo si existe. */
export function getOnniVoiceMode(): OnniVoiceMode {
  if (isDesktopWebBrowser() && isOnniVoiceSupported()) return "web";
  const native = getNativeVoiceBridge();
  if (typeof native?.speak === "function" && typeof native?.startListening === "function") {
    return "native";
  }
  if (isOnniVoiceSupported()) return "web";
  return "none";
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

export function speakWithWebVoice(text: string): boolean {
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

export function speakOnniAnswer(text: string, mode: OnniVoiceMode): boolean {
  if (mode === "web") return speakWithWebVoice(text);
  if (mode === "native") return speakWithNativeVoice(text);
  return false;
}
