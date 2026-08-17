import { isMobileCoarseDevice } from "@/lib/webglRendererPrefs";

/** Hay puente Android inyectado (Onnivers APK, Capacitor, etc.). */
export function isNativeAndroidLobby(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.Android !== "undefined" || typeof window.AndroidBridge !== "undefined";
}

/**
 * Solo el APK Capacitor (ViveVR) expone overlay nativo sobre la pantalla del lobby.
 * Onnivers Play Store tiene {@code window.Android} pero sin esos métodos: el video va en HTML.
 */
export function hasNativeLobbyVideoOverlay(): boolean {
  const android = typeof window !== "undefined" ? window.Android : undefined;
  if (!android) return false;
  return (
    typeof android.loadLobbyPantalla2Player === "function" ||
    typeof android.loadLobbyPantalla2Url === "function" ||
    typeof android.showLobbyPantalla2WebView === "function"
  );
}

/** Lobby en celular/tablet: aligerar escena 3D para que el MP4 no compita con WebGL. */
export function lobbyShouldUseMobileLiteScene(): boolean {
  return isMobileCoarseDevice();
}
