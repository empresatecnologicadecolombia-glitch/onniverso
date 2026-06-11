/**
 * GET /api/azure/speech-token
 * Devuelve un token temporal (~10 min) para usar el Azure Speech SDK
 * directo desde el cliente (streaming STT del .exe), sin exponer la key.
 */
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const key = process.env.AZURE_SPEECH_KEY?.trim();
    const region = process.env.AZURE_SPEECH_REGION?.trim() || "brazilsouth";
    const language = process.env.AZURE_SPEECH_STT_LANGUAGE?.trim() || "es-CO";
    if (!key) {
      return res.status(500).json({ ok: false, error: "Falta AZURE_SPEECH_KEY en Vercel." });
    }

    const tokenRes = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" },
      },
    );

    if (!tokenRes.ok) {
      return res
        .status(502)
        .json({ ok: false, error: `Azure no emitió token (${tokenRes.status}).` });
    }

    const token = await tokenRes.text();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, token, region, language });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err instanceof Error ? err.message : "Error inesperado" });
  }
}
