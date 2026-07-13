import { ONNI_POST_SPEAK_PAUSE_MS } from "@/lib/onniElevenLabsTts";

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

function clearActivePlayback() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

export function stopElectronPiperVoice(): void {
  clearActivePlayback();
}

export function isOnniElectronPiperBridgePresent(): boolean {
  return typeof window.onniversDesktop?.piper?.synthesize === "function";
}

export async function isOnniElectronPiperAvailable(): Promise<boolean> {
  const piper = window.onniversDesktop?.piper;
  if (!piper?.synthesize) return false;
  if (typeof piper.isAvailable !== "function") return true;
  try {
    return Boolean(await piper.isAvailable());
  } catch {
    return false;
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/** TTS local Piper en OnniVers PC (.exe). */
export async function speakWithElectronPiperVoice(text: string): Promise<boolean> {
  const clean = text.replace(/\n+/g, ". ").trim();
  if (!clean) return false;

  const piper = window.onniversDesktop?.piper;
  if (!piper?.synthesize) return false;

  stopElectronPiperVoice();

  try {
    const result = await piper.synthesize({ text: clean });
    const audioBase64 = String(result?.audioBase64 ?? "").trim();
    if (!audioBase64) return false;

    const mimeType = String(result?.mimeType ?? "audio/wav");
    const blob = base64ToBlob(audioBase64, mimeType);
    if (!blob.size) return false;

    const url = URL.createObjectURL(blob);
    activeObjectUrl = url;
    const audio = new Audio(url);
    activeAudio = audio;
    window.dispatchEvent(new CustomEvent("voice:speak-start"));

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("playback_failed"));
      void audio.play().catch(reject);
    });

    clearActivePlayback();
    window.dispatchEvent(new CustomEvent("voice:speak-end"));
    window.dispatchEvent(new CustomEvent("voice:spoke"));
    await new Promise<void>((resolve) => window.setTimeout(resolve, ONNI_POST_SPEAK_PAUSE_MS));
    console.info("[Onni TTS] piper-local");
    return true;
  } catch (error) {
    console.warn("[Onni TTS] piper-local falló", error);
    clearActivePlayback();
    return false;
  }
}
