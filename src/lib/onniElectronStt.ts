import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

export async function transcribeOnniElectronAudio(blob: Blob): Promise<string> {
  if (!blob.size) return "";

  const mimeType = blob.type || "audio/webm";
  const base64 = await blobToBase64(blob);

  const { data, error } = await supabase.functions.invoke("onni-stt", {
    body: { audioBase64: base64, mimeType },
  });

  if (!error && data && typeof data === "object") {
    const text = String((data as { text?: string }).text ?? "").trim();
    if (text) return text;
    const backendError = String((data as { error?: string }).error ?? "").trim();
    if (backendError) throw new Error(backendError);
  }

  const response = await fetch(`${supabasePublicUrl}/functions/v1/onni-stt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
    },
    body: JSON.stringify({ audioBase64: base64, mimeType }),
  });

  const json = (await response.json()) as { text?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.error || error?.message || "No se pudo transcribir el audio.");
  }
  return String(json.text ?? "").trim();
}

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
