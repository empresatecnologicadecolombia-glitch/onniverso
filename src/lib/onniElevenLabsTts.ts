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

/** Detiene voz ElevenLabs en reproducción (solo cliente). */
export function stopElevenLabsVoice(): void {
  clearActivePlayback();
}

/**
 * TTS ElevenLabs vía /api/elevenlabs/speech-tts (APK Android).
 */
export async function speakWithElevenLabsVoice(text: string): Promise<boolean> {
  const clean = text.replace(/\n+/g, ". ").trim();
  if (!clean) return false;

  stopElevenLabsVoice();

  try {
    const res = await fetch("/api/elevenlabs/speech-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean }),
    });
    if (!res.ok) return false;

    const blob = await res.blob();
    if (!blob.size) return false;

    const url = URL.createObjectURL(blob);
    activeObjectUrl = url;
    const audio = new Audio(url);
    activeAudio = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("playback_failed"));
      void audio.play().catch(reject);
    });

    clearActivePlayback();
    return true;
  } catch {
    clearActivePlayback();
    return false;
  }
}
