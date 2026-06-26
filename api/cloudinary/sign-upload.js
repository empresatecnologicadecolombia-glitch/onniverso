/**
 * POST /api/cloudinary/sign-upload
 * Firma parámetros para subida directa a Cloudinary (video / raw / image).
 */
import crypto from "node:crypto";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function signCloudinaryParams(params, apiSecret) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + apiSecret).digest("hex");
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
    const resourceType = String(body.resource_type ?? "auto").trim();
    const folder = String(body.folder ?? "").trim();
    const publicId = String(body.public_id ?? "").trim();
    const uploadPreset = String(body.upload_preset ?? "").trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({ ok: false, error: "Faltan credenciales Cloudinary." });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp };
    if (folder) paramsToSign.folder = folder;
    if (publicId) paramsToSign.public_id = publicId;
    if (uploadPreset) paramsToSign.upload_preset = uploadPreset;

    const signature = signCloudinaryParams(paramsToSign, apiSecret);

    return res.status(200).json({
      ok: true,
      cloud_name: cloudName,
      api_key: apiKey,
      timestamp,
      signature,
      folder: folder || undefined,
      public_id: publicId || undefined,
      upload_preset: uploadPreset || undefined,
      resource_type: resourceType,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    });
  }
}
