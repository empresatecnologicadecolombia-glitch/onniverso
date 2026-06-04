import { LOBBY_EARTH_DEFAULT_CLIP_URL } from "@/lib/lobbyEarthClip";

/** Hay puente nativo inyectado por MainActivity (APK). */
export function hasAndroidNativeBridge(): boolean {
  return typeof window.AndroidBridge !== "undefined" || typeof window.Android !== "undefined";
}

function callNativeOpenLobby(clipUrl: string): boolean {
  const url = clipUrl.trim();
  if (window.AndroidBridge?.openLobbyDirect) {
    window.AndroidBridge.openLobbyDirect(url);
    return true;
  }
  if (window.Android?.openLobbyDirect) {
    window.Android.openLobbyDirect(url);
    return true;
  }
  if (window.Android?.openLobby) {
    window.Android.openLobby();
    return true;
  }
  return false;
}

/**
 * Tierra en inicio / APK: lobby inmersivo en {@code LobbyVrActivity} (estéreo nativo), directo.
 */
export function invokeOpenLobbyStereoDirect(): boolean {
  return callNativeOpenLobby("");
}

/**
 * Abre lobby nativo. Con {@param clipUrl} vacío → solo estéreo; con URL → legacy selector (si se usa).
 */
export function invokeOpenLobbyDirect(clipUrl = LOBBY_EARTH_DEFAULT_CLIP_URL): boolean {
  return callNativeOpenLobby(clipUrl);
}
