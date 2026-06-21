import { isNativeAndroid } from "@/lib/nativePlayback";

const YOUTUBE_CINE_URL = "https://www.youtube.com";

function normalizeYouTubeCineUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return YOUTUBE_CINE_URL;
  const lower = trimmed.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    if (lower.includes("m.youtube.com")) return YOUTUBE_CINE_URL;
    return trimmed;
  }
  return trimmed;
}

/** Selector Cine / Cine Cam solo en APK. En PC se abre el enlace directo. */
export function shouldShowHomeSocialCinePicker(): boolean {
  if (!isNativeAndroid()) return false;
  return (
    typeof window.Android?.openRedesCamDirect === "function" &&
    (typeof window.AndroidBridge?.openRedesStereoCine === "function" ||
      typeof window.Android?.openVrRedes === "function")
  );
}

/** Solo icono YouTube — botón Cine: estéreo SBS nativo; si no hay APK nueva, overlay que ya funcionaba. */
export function openYouTubeRedesCine(url: string): void {
  const target = normalizeYouTubeCineUrl(url);
  if (!target) return;

  if (typeof window.AndroidBridge?.openRedesStereoCine === "function") {
    window.AndroidBridge.openRedesStereoCine(target);
    return;
  }

  openHomeSocialRedes(target);
}

/** Abre red social en modo Redes (VR). */
export function openHomeSocialRedes(url: string): void {
  const target = url.trim();
  if (!target) return;

  if (typeof window.Android !== "undefined") {
    if (typeof window.Android.openVrRedes === "function") {
      window.Android.openVrRedes(target);
      return;
    }
  }

  window.open(target, "_blank", "noopener,noreferrer");
}

/** Abre red social en modo Redes Cam. */
export function openHomeSocialRedesCam(url: string): void {
  const target = url.trim();
  if (!target) return;

  if (typeof window.Android !== "undefined") {
    if (typeof window.Android.openRedesCamDirect === "function") {
      window.Android.openRedesCamDirect(target);
      return;
    }
  }

  window.open(target, "_blank", "noopener,noreferrer");
}
