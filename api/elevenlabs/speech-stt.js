/**
 * POST /api/elevenlabs/speech-stt
 * STT ElevenLabs — body: { audioBase64 } (WAV u otro formato soportado).
 */
const MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_MODEL_ID = "scribe_v2";
const DEFAULT_LANGUAGE = "spa";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getElevenLabsConfig() {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  const modelId = process.env.ELEVENLABS_STT_MODEL?.trim() || DEFAULT_MODEL_ID;
  const languageCode = process.env.ELEVENLABS_STT_LANGUAGE?.trim() || DEFAULT_LANGUAGE;
  if (!key) {
    throw new Error("Falta ELEVENLABS_API_KEY en Vercel.");
  }
  return { key, modelId, languageCode };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const body = req.body ?? {};
    let audioBuffer;

    if (typeof body.audioBase64 === "string" && body.audioBase64.trim()) {
      audioBuffer = Buffer.from(body.audioBase64.trim(), "base64");
    } else if (Buffer.isBuffer(body)) {
      audioBuffer = body;
    } else if (body instanceof ArrayBuffer) {
      audioBuffer = Buffer.from(body);
    } else {
      return res.status(400).json({ ok: false, error: "Envía { audioBase64 } con audio" });
    }

    if (!audioBuffer?.length) {
      return res.status(400).json({ ok: false, error: "Audio vacío" });
    }
    if (audioBuffer.length > MAX_BYTES) {
      return res.status(413).json({ ok: false, error: "Audio demasiado largo" });
    }

    const { key, modelId, languageCode } = getElevenLabsConfig();
    const form = new FormData();
    form.append(
      "file",
      new Blob([audioBuffer], { type: "audio/wav" }),
      "onnivers-audio.wav",
    );
    form.append("model_id", modelId);
    form.append("language_code", languageCode);
    form.append("tag_audio_events", "false");

    const elevenRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": key,
      },
      body: form,
    });

    const rawText = await elevenRes.text();
    if (!elevenRes.ok) {
      return res.status(502).json({
        ok: false,
        error: "ElevenLabs STT falló",
        status: elevenRes.status,
        detail: rawText.slice(0, 200),
      });
    }

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch {
      return res.status(502).json({ ok: false, error: "Respuesta ElevenLabs inválida" });
    }

    const text = String(payload.text ?? payload.transcript ?? "").trim();

    return res.status(200).json({
      ok: true,
      text,
      status: text ? "success" : "nomatch",
      message: text ? undefined : "No se entendió el audio",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return res.status(500).json({ ok: false, error: message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
