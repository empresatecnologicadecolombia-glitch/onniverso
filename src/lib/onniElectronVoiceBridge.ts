import { isElectronDesktopApp } from "@/lib/deviceDetection";
import { pickOnniSpanishVoice } from "@/lib/onniVoice";
import { transcribeOnniElectronWhisper } from "@/lib/onniElectronWhisperStt";

/** Grabación corta: ~3 s típico, máximo 4 s (usuario pidió máx. 5 s). */
const SESSION_MAX_MS = 4000;
const RECORDER_SLICE_MS = 250;
const MIN_AUDIO_BYTES = 600;

type NativeVoiceBridge = {
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
};

let resolvedBridge: NativeVoiceBridge | null | undefined;
let resolveBridgePromise: Promise<NativeVoiceBridge | null> | null = null;

function dispatchVoiceEvent(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function speakDesktop(text: string) {
  if (!text.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.replace(/\n+/g, ". ").trim();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickOnniSpanishVoice(window.speechSynthesis.getVoices());
  utterance.lang = voice?.lang ?? "es-CO";
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
let listeningActive = false;
let transcribeBusy = false;
let pendingListen = false;
let lastSttErrorMessage = "";
let lastSttErrorAt = 0;

const STT_ERROR_COOLDOWN_MS = 20000;

function clearSessionTimer() {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }
}

function releaseStream() {
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) track.stop();
    mediaStream = null;
  }
}

async function ensureMicrophoneStream(): Promise<MediaStream> {
  if (mediaStream?.active) return mediaStream;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Este OnniVers no puede acceder al micrófono.");
  }
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  return mediaStream;
}

function pickRecorderMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function schedulePendingListen() {
  if (!pendingListen || transcribeBusy || listeningActive) return;
  pendingListen = false;
  window.setTimeout(() => {
    void startListeningSession();
  }, 300);
}

function dispatchSttError(message: string) {
  const trimmed = message.trim();
  const now = Date.now();
  if (
    trimmed &&
    trimmed === lastSttErrorMessage &&
    now - lastSttErrorAt < STT_ERROR_COOLDOWN_MS
  ) {
    dispatchVoiceEvent("voice:error", { code: "empty_audio", message: null });
    return;
  }
  if (trimmed) {
    lastSttErrorMessage = trimmed;
    lastSttErrorAt = now;
  }
  dispatchVoiceEvent("voice:error", {
    code: "stt_failed",
    message: trimmed || "No pude transcribir tu voz. Inténtalo otra vez.",
  });
}

async function finalizeRecording() {
  if (transcribeBusy) return;
  transcribeBusy = true;
  clearSessionTimer();

  const chunks = audioChunks;
  audioChunks = [];
  listeningActive = false;

  const recorder = mediaRecorder;
  mediaRecorder = null;

  try {
    if (chunks.length === 0) {
      dispatchVoiceEvent("voice:error", { code: "empty_audio", message: null });
      return;
    }

    const mimeType = recorder?.mimeType || pickRecorderMimeType() || "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });

    if (blob.size < MIN_AUDIO_BYTES) {
      dispatchVoiceEvent("voice:error", { code: "empty_audio", message: null });
      return;
    }

    const text = await transcribeOnniElectronWhisper(blob);
    if (text) {
      dispatchVoiceEvent("voice:result", { text, isFinal: true });
      return;
    }

    dispatchSttError("No entendí lo que dijiste. Intenta otra vez con una frase clara.");
  } catch (error) {
    const detail = error instanceof Error ? error.message.trim() : "";
    dispatchSttError(detail || "No pude transcribir tu voz. Inténtalo otra vez.");
  } finally {
    transcribeBusy = false;
    releaseStream();
    dispatchVoiceEvent("voice:end");
    schedulePendingListen();
  }
}

function stopRecorderTracks() {
  clearSessionTimer();
  const recorder = mediaRecorder;
  if (!recorder) {
    void finalizeRecording();
    return;
  }
  if (recorder.state === "inactive") {
    void finalizeRecording();
    return;
  }
  try {
    if (typeof recorder.requestData === "function") {
      recorder.requestData();
    }
    recorder.stop();
  } catch {
    void finalizeRecording();
  }
}

async function startListeningSession() {
  if (listeningActive) return;
  if (transcribeBusy) {
    pendingListen = true;
    return;
  }

  listeningActive = true;
  audioChunks = [];

  try {
    const stream = await ensureMicrophoneStream();
    const mimeType = pickRecorderMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };
    recorder.onstop = () => {
      void finalizeRecording();
    };
    recorder.onerror = () => {
      listeningActive = false;
      dispatchVoiceEvent("voice:error", {
        code: "audio",
        message: "Falló la captura de audio. Cierra otras apps que usen el micrófono.",
      });
      releaseStream();
      dispatchVoiceEvent("voice:end");
    };

    dispatchVoiceEvent("voice:start");
    recorder.start(RECORDER_SLICE_MS);
    sessionTimer = setTimeout(() => stopRecorderTracks(), SESSION_MAX_MS);
  } catch (error) {
    listeningActive = false;
    releaseStream();
    const denied =
      error instanceof DOMException &&
      (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
    dispatchVoiceEvent("voice:error", {
      code: "permission_denied",
      message: denied
        ? "Permite el micrófono: Configuración de Windows → Privacidad → Micrófono → OnniVers."
        : "No pude abrir el micrófono en OnniVers.",
    });
    dispatchVoiceEvent("voice:end");
  }
}

const mediaRecorderBridge: NativeVoiceBridge = {
  startListening() {
    if (listeningActive) return;
    if (transcribeBusy) {
      pendingListen = true;
      return;
    }
    void startListeningSession();
  },
  stopListening() {
    pendingListen = false;
    if (!listeningActive && !mediaRecorder) return;
    stopRecorderTracks();
  },
  speak: speakDesktop,
  stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  },
};

function getMediaRecorderBridge(): NativeVoiceBridge | null {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  if (typeof MediaRecorder === "undefined") return null;
  return mediaRecorderBridge;
}

async function pickElectronVoiceBridge(): Promise<NativeVoiceBridge | null> {
  if (!isElectronDesktopApp()) return null;
  return getMediaRecorderBridge();
}

/** Resuelve una sola vez qué puente de voz usar en Electron. */
export function warmUpElectronVoiceBridge(): Promise<NativeVoiceBridge | null> {
  if (resolvedBridge !== undefined) {
    return Promise.resolve(resolvedBridge);
  }
  if (!resolveBridgePromise) {
    resolveBridgePromise = pickElectronVoiceBridge().then((bridge) => {
      resolvedBridge = bridge;
      return bridge;
    });
  }
  return resolveBridgePromise;
}

export function getElectronVoiceBridge(): NativeVoiceBridge | null {
  if (resolvedBridge !== undefined) return resolvedBridge;
  return getMediaRecorderBridge();
}
