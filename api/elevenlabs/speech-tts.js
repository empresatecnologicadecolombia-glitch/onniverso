/**
 * POST /api/elevenlabs/speech-tts
 * TTS ElevenLabs — clave solo en servidor (Vercel env).
 * Body: { "text": "..." }
 */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const MAX_CHARS = 2800;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getElevenLabsConfig() {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  if (!key) {
    throw new Error("Falta ELEVENLABS_API_KEY en Vercel.");
  }
  return { key, voiceId, modelId };
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
    const raw =
      typeof req.body?.text === "string"
        ? req.body.text
        : typeof req.body === "string"
          ? req.body
          : "";
    const text = raw.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
    if (!text) {
      return res.status(400).json({ ok: false, error: "Texto vacío" });
    }

    const { key, voiceId, modelId } = getElevenLabsConfig();
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;

    const elevenRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.78,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    });

    if (!elevenRes.ok) {
      const detail = await elevenRes.text().catch(() => "");
      return res.status(502).json({
        ok: false,
        error: "ElevenLabs TTS falló",
        status: elevenRes.status,
        detail: detail.slice(0, 200),
      });
    }

    const audio = Buffer.from(await elevenRes.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audio);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return res.status(500).json({ ok: false, error: message });
  }
}
