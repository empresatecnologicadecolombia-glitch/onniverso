/**
 * POST /api/cloudinary/test-connection
 * Prueba credenciales Cloudinary sin exponer el secret al cliente en producción.
 */
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const cloudName = String(body.cloud_name ?? process.env.CLOUDINARY_CLOUD_NAME ?? "").trim();
    const apiKey = String(body.api_key ?? process.env.CLOUDINARY_API_KEY ?? "").trim();
    const apiSecret = String(body.api_secret ?? process.env.CLOUDINARY_API_SECRET ?? "").trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({
        ok: false,
        error: "Faltan cloud_name, api_key o api_secret.",
      });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const pingRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!pingRes.ok) {
      const detail = await pingRes.text().catch(() => "");
      return res.status(502).json({
        ok: false,
        error: `Cloudinary rechazó las credenciales (${pingRes.status}). ${detail.slice(0, 120)}`,
      });
    }

    return res.status(200).json({
      ok: true,
      message: `Conexión OK con la nube «${cloudName}».`,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    });
  }
}
