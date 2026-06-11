/**
 * STT streaming de Azure para OnniVers .exe (push-to-talk rápido).
 * Transcribe MIENTRAS el usuario habla (websocket del Speech SDK),
 * así al soltar el botón el texto está casi listo (~0.5-1 s).
 *
 * Solo se usa en Electron; si el token o el SDK fallan, el llamador
 * (onniAzureStt.ts) cae al flujo clásico de grabar + subir WAV.
 */
import type * as SpeechSdk from "microsoft-cognitiveservices-speech-sdk";

const MAX_RECORD_MS = 25_000;
const STOP_FLUSH_TIMEOUT_MS = 1_500;
/** El token de Azure dura ~10 min; renovamos antes. */
const TOKEN_TTL_MS = 8 * 60_000;

type TokenInfo = { token: string; region: string; language: string; fetchedAt: number };

type StreamingSession = {
  recognizer: SpeechSdk.SpeechRecognizer;
  finals: string[];
  partial: string;
  flushResolvers: (() => void)[];
  maxTimer: number;
};

let cachedToken: TokenInfo | null = null;
let activeStreaming: StreamingSession | null = null;

async function fetchSpeechToken(): Promise<TokenInfo | null> {
  if (cachedToken && Date.now() - cachedToken.fetchedAt < TOKEN_TTL_MS) {
    return cachedToken;
  }
  try {
    const res = await fetch("/api/azure/speech-token");
    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      token?: string;
      region?: string;
      language?: string;
    } | null;
    if (!res.ok || !payload?.ok || !payload.token || !payload.region) return null;
    cachedToken = {
      token: payload.token,
      region: payload.region,
      language: payload.language || "es-CO",
      fetchedAt: Date.now(),
    };
    return cachedToken;
  } catch {
    return null;
  }
}

export function isAzureStreamingRecording(): boolean {
  return activeStreaming !== null;
}

export async function startAzureStreamingRecognition(): Promise<boolean> {
  if (activeStreaming) return true;

  const tokenInfo = await fetchSpeechToken();
  if (!tokenInfo) return false;

  let sdk: typeof SpeechSdk;
  try {
    sdk = await import("microsoft-cognitiveservices-speech-sdk");
  } catch {
    return false;
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(tokenInfo.token, tokenInfo.region);
    speechConfig.speechRecognitionLanguage = tokenInfo.language;
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    const session: StreamingSession = {
      recognizer,
      finals: [],
      partial: "",
      flushResolvers: [],
      maxTimer: 0,
    };

    recognizer.recognizing = (_s, e) => {
      if (e.result?.text) session.partial = e.result.text;
    };
    recognizer.recognized = (_s, e) => {
      if (e.result?.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        session.finals.push(e.result.text);
      }
      session.partial = "";
      session.flushResolvers.splice(0).forEach((resolve) => resolve());
    };

    await new Promise<void>((resolve, reject) => {
      recognizer.startContinuousRecognitionAsync(resolve, (err) => reject(new Error(err)));
    });

    session.maxTimer = window.setTimeout(() => {
      if (activeStreaming === session) {
        void stopAzureStreamingRecognitionAndGetText();
      }
    }, MAX_RECORD_MS);

    activeStreaming = session;
    return true;
  } catch {
    return false;
  }
}

export async function stopAzureStreamingRecognitionAndGetText(): Promise<string> {
  const session = activeStreaming;
  if (!session) return "";
  activeStreaming = null;
  window.clearTimeout(session.maxTimer);

  // Si hay un parcial sin finalizar, dale una ventana corta para que
  // Azure emita el resultado final tras detener el flujo.
  const hadPartial = Boolean(session.partial.trim());

  await new Promise<void>((resolve) => {
    session.recognizer.stopContinuousRecognitionAsync(resolve, () => resolve());
  });

  if (hadPartial && session.partial.trim()) {
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, STOP_FLUSH_TIMEOUT_MS);
      session.flushResolvers.push(() => {
        window.clearTimeout(timer);
        resolve();
      });
    });
  }

  try {
    session.recognizer.close();
  } catch {
    /* ya cerrado */
  }

  const tail = session.partial.trim();
  const parts = [...session.finals];
  if (tail) parts.push(tail);
  return parts.join(" ").trim();
}

export function cancelAzureStreamingRecognition(): void {
  const session = activeStreaming;
  if (!session) return;
  activeStreaming = null;
  window.clearTimeout(session.maxTimer);
  session.recognizer.stopContinuousRecognitionAsync(
    () => session.recognizer.close(),
    () => session.recognizer.close(),
  );
}
