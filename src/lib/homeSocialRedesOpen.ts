import { isNativeAndroid } from "@/lib/nativePlayback";

const SALA_DIVIDIDA: "OPEN_SALA_DIVIDIDA" = "OPEN_SALA_DIVIDIDA";

/** Solo streams directos (.m3u8 / .mp4). Páginas web (YouTube, Caracol web) no son reproducibles en ExoPlayer. */
function isDirectMediaStreamUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const path = new URL(trimmed).pathname.toLowerCase();
    return path.includes(".m3u8") || path.includes(".mp4");
  } catch {
    const lower = trimmed.toLowerCase();
    return lower.includes(".m3u8") || lower.includes(".mp4");
  }
}

/** Selector Cine / Cine Cam solo en APK (WebView nativo). En PC se abre el enlace directo. */
export function shouldShowHomeSocialCinePicker(): boolean {
  if (!isNativeAndroid()) return false;
  return (
    typeof window.AndroidBridge?.openSalaDirect === "function" &&
    typeof window.Android?.openRedesCamDirect === "function"
  );
}

/** Abre red social en modo Cine (split nativo vía AndroidBridge.openSalaDirect). */
export function openHomeSocialRedesCine(url: string): void {
  const target = url.trim();
  if (!target) return;

  if (isDirectMediaStreamUrl(target) && typeof window.AndroidBridge?.openSalaDirect === "function") {
    window.AndroidBridge.openSalaDirect(target, SALA_DIVIDIDA);
    return;
  }

  if (typeof window.Android?.openVrRedes === "function") {
    window.Android.openVrRedes(target);
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
