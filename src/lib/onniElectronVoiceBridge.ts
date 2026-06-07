import { isElectronDesktopApp } from "@/lib/deviceDetection";
import { pickOnniSpanishVoice } from "@/lib/onniVoice";
import { transcribeBlobWithAzure } from "@/lib/onniAzureStt";
import {
  isOnniElectronWhisperAvailable,
  transcribeOnniElectronWhisper,
} from "@/lib/onniElectronWhisperStt";

/** Grabación por turno (Whisper local primero; Azure solo respaldo en .exe). */
const SESSION_MAX_MS = 9000;
/** Mínimo antes de cerrar el clip (evita WebM sin cabecera EBML). */
const MIN_RECORD_MS = 1200;
const MIN_AUDIO_BYTES = 2000;

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

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedBlob: Blob | null = null;
let recordingStartedAt = 0;
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
let minRecordTimer: ReturnType<typeof setTimeout> | null = null;
let listeningActive = false;
let transcribeBusy = false;
let pendingListen = false;
let stopRequested = false;
let lastSttErrorMessage = "";
let lastSttErrorAt = 0;

const STT_ERROR_COOLDOWN_MS = 20000;

function clearSessionTimer() {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }
}

function clearMinRecordTimer() {
  if (minRecordTimer) {
    clearTimeout(minRecordTimer);
    minRecordTimer = null;
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

async function hasValidAudioContainer(blob: Blob): Promise<boolean> {
  if (blob.size < MIN_AUDIO_BYTES) return false;
  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  const isWebm =
    header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
  const isOgg =
    header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53;
  const isWav =
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
  return isWebm || isOgg || isWav;
}

async function transcribeRecording(blob: Blob): Promise<string> {
  if (isOnniElectronWhisperAvailable()) {
    try {
      const text = await transcribeOnniElectronWhisper(blob);
      if (text) return text;
    } catch {
      /* Whisper local falló; probar Azure si hay red */
    }
  }
  try {
    const text = await transcribeBlobWithAzure(blob);
    if (text) return text;
  } catch {
    /* Azure no disponible o error de red */
  }
  return "";
}

async function finalizeRecording() {
  if (transcribeBusy) return;
  transcribeBusy = true;
  clearSessionTimer();
  clearMinRecordTimer();
  listeningActive = false;
  stopRequested = false;

  const blob = recordedBlob;
  recordedBlob = null;
  mediaRecorder = null;

  try {
    if (!blob || blob.size < MIN_AUDIO_BYTES) {
      dispatchVoiceEvent("voice:error", { code: "empty_audio", message: null });
      return;
    }

    if (!(await hasValidAudioContainer(blob))) {
      dispatchVoiceEvent("voice:error", { code: "empty_audio", message: null });
      return;
    }

    const text = await transcribeRecording(blob);
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

async function stopRecorderTracks() {
  clearSessionTimer();
  stopRequested = true;

  const recorder = mediaRecorder;
  if (!recorder || recorder.state === "inactive") {
    if (recordedBlob) {
      await finalizeRecording();
    } else {
      dispatchVoiceEvent("voice:error", { code: "empty_audio", message: null });
      listeningActive = false;
      dispatchVoiceEvent("voice:end");
      schedulePendingListen();
    }
    return;
  }

  const elapsed = Date.now() - recordingStartedAt;
  const waitMs = Math.max(0, MIN_RECORD_MS - elapsed);
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    if (recordedBlob) {
      await finalizeRecording();
    }
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const active = mediaRecorder;
      if (!active) {
        resolve();
        return;
      }

      active.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedBlob = event.data;
        }
      };
      active.onstop = () => resolve();
      active.onerror = () => reject(new Error("audio"));

      try {
        active.stop();
      } catch (error) {
        reject(error);
      }
    });
  } catch {
    listeningActive = false;
    dispatchVoiceEvent("voice:error", {
      code: "audio",
      message: "Falló la captura de audio. Cierra otras apps que usen el micrófono.",
    });
    dispatchVoiceEvent("voice:end");
    return;
  }

  await finalizeRecording();
}

function requestStopRecorder() {
  if (!listeningActive && !mediaRecorder) return;
  if (stopRequested && minRecordTimer) return;

  clearMinRecordTimer();
  const elapsed = Date.now() - recordingStartedAt;
  const waitMs = Math.max(0, MIN_RECORD_MS - elapsed);

  if (waitMs > 0) {
    minRecordTimer = setTimeout(() => {
      minRecordTimer = null;
      void stopRecorderTracks();
    }, waitMs);
    return;
  }

  void stopRecorderTracks();
}

async function startListeningSession() {
  if (listeningActive) return;
  if (transcribeBusy) {
    pendingListen = true;
    return;
  }

  listeningActive = true;
  stopRequested = false;
  recordedBlob = null;
  recordingStartedAt = Date.now();

  try {
    const stream = await ensureMicrophoneStream();
    const mimeType = pickRecorderMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedBlob = event.data;
      }
    };
    recorder.onerror = () => {
      listeningActive = false;
      mediaRecorder = null;
      recordedBlob = null;
      dispatchVoiceEvent("voice:error", {
        code: "audio",
        message: "Falló la captura de audio. Cierra otras apps que usen el micrófono.",
      });
      releaseStream();
      dispatchVoiceEvent("voice:end");
    };

    dispatchVoiceEvent("voice:start");
    // Un solo blob al detener: WebM válido con cabecera EBML (timeslice rompe clips en Electron).
    recorder.start();
    sessionTimer = setTimeout(() => requestStopRecorder(), SESSION_MAX_MS);
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
    requestStopRecorder();
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
