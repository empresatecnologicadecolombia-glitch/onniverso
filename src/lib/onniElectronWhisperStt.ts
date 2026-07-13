function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo leer el audio."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el audio."));
    reader.readAsDataURL(blob);
  });
}

export async function transcribeOnniElectronWhisper(blob: Blob): Promise<string> {
  if (!blob.size) return "";

  const whisper = window.onniversDesktop?.whisper;
  if (!whisper?.transcribe) {
    throw new Error("Whisper no está disponible en este OnniVers.");
  }

  const audioBase64 = await blobToBase64(blob);
  const result = await whisper.transcribe({
    audioBase64,
    mimeType: blob.type || "audio/webm",
  });

  return String(result?.text ?? "").trim();
}

export function isOnniElectronWhisperBridgePresent(): boolean {
  return typeof window.onniversDesktop?.whisper?.transcribe === "function";
}

export async function isOnniElectronWhisperAvailable(): Promise<boolean> {
  const whisper = window.onniversDesktop?.whisper;
  if (!whisper?.transcribe) return false;
  if (typeof whisper.isAvailable !== "function") return true;
  try {
    return Boolean(await whisper.isAvailable());
  } catch {
    return false;
  }
}
