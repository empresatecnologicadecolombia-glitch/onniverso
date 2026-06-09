import { publicAssetUrl } from "@/lib/publicAssetUrl";

const FALLBACK_POSTER = publicAssetUrl("educacion-inmersiva.jpeg");

/** Fotograma de un MP4 en Cloudinary como imagen de tarjeta (`startOffset` en segundos). */
export function cloudinaryVideoPosterUrl(videoUrl: string, startOffset = 0): string {
  const raw = videoUrl.trim();
  if (!raw) return FALLBACK_POSTER;
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("cloudinary.com") || !parsed.pathname.includes("/video/")) {
      return FALLBACK_POSTER;
    }
    if (raw.includes("/upload/so_")) return raw.replace(/\.mp4(\?.*)?$/i, ".jpg$1");
    const safeOffset = Math.max(0, Math.round(startOffset));
    const withFrame = raw.replace("/upload/", `/upload/so_${safeOffset}/`);
    return withFrame.replace(/\.mp4(\?.*)?$/i, ".jpg$1");
  } catch {
    return FALLBACK_POSTER;
  }
}
