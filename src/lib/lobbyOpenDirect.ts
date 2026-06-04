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
 * Abre lobby nativo (WebView Capacitor + selector con clip en APK).
 * {@param clipUrl} MP4/HLS para {@link SelectorActivity} en escena split; por defecto clip 360° del lobby.
 */
export function invokeOpenLobbyDirect(clipUrl = LOBBY_EARTH_DEFAULT_CLIP_URL): boolean {
  return callNativeOpenLobby(clipUrl);
}
