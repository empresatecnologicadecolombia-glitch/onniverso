import { isElectronDesktopApp } from "@/lib/deviceDetection";
import { isOnniVoiceSupported, pickOnniSpanishVoice } from "@/lib/onniVoice";
import { transcribeOnniElectronAudio } from "@/lib/onniElectronStt";

const SESSION_MAX_MS = 7000;

type NativeVoiceBridge = {
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
};

let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
let listeningActive = false;
let transcribeBusy = false;

function dispatchVoiceEvent(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

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

function speakDesktop(text: string) {
  if (!isOnniVoiceSupported() || !text.trim()) return;
  const clean = text.replace(/\n+/g, ". ").trim();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickOnniSpanishVoice(window.speechSynthesis.getVoices());
  utterance.lang = voice?.lang ?? "es-CO";
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
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
      dispatchVoiceEvent("voice:end");
      return;
    }

    const mimeType = recorder?.mimeType || pickRecorderMimeType() || "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });
    const text = await transcribeOnniElectronAudio(blob);
    if (text) {
      dispatchVoiceEvent("voice:result", { text, isFinal: true });
    }
  } catch {
    dispatchVoiceEvent("voice:error", { code: "network", message: null });
  } finally {
    transcribeBusy = false;
    releaseStream();
    dispatchVoiceEvent("voice:end");
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
    recorder.stop();
  } catch {
    void finalizeRecording();
  }
}

async function startListeningSession() {
  if (listeningActive || transcribeBusy) return;
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
      dispatchVoiceEvent("voice:error", { code: "audio", message: null });
      releaseStream();
    };

    dispatchVoiceEvent("voice:start");
    recorder.start();
    sessionTimer = setTimeout(() => stopRecorderTracks(), SESSION_MAX_MS);
  } catch {
    listeningActive = false;
    releaseStream();
    dispatchVoiceEvent("voice:error", { code: "permission_denied", message: null });
    dispatchVoiceEvent("voice:end");
  }
}

const electronVoiceBridge: NativeVoiceBridge = {
  startListening() {
    void startListeningSession();
  },
  stopListening() {
    if (!listeningActive && !mediaRecorder) return;
    stopRecorderTracks();
  },
  speak(text: string) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speakDesktop(text);
  },
  stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  },
};

export function getElectronVoiceBridge(): NativeVoiceBridge | null {
  if (!isElectronDesktopApp()) return null;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  if (typeof MediaRecorder === "undefined") return null;
  return electronVoiceBridge;
}
