/** Acción legacy por si algún build antiguo solo expone openModelDirect. */
export const OPEN_LOBBY_IMMERSIVE_STEREO_ACTION = "OPEN_LOBBY_IMMERSIVE";

export const LOBBY_IMMERSIVE_PRODUCTION_URL = "https://onnivers.com/lobby-inmersivo";

/** Hay puente nativo inyectado por MainActivity (APK). */
export function hasAndroidNativeBridge(): boolean {
  return typeof window.AndroidBridge !== "undefined" || typeof window.Android !== "undefined";
}

/**
 * Tierra en inicio (APK): misma pantalla dividida estéreo que el birrete, pero URL del lobby.
 * Usa {@code openLobbyImmersiveStereo} — no {@code openModelDirect} (ese abre el aula).
 */
export function invokeOpenLobbyStereoDirect(): boolean {
  if (window.AndroidBridge?.openLobbyImmersiveStereo) {
    window.AndroidBridge.openLobbyImmersiveStereo();
    return true;
  }
  if (window.Android?.openLobbyImmersiveStereo) {
    window.Android.openLobbyImmersiveStereo();
    return true;
  }
  if (window.AndroidBridge?.openLobbyDirect) {
    window.AndroidBridge.openLobbyDirect("");
    return true;
  }
  if (window.Android?.openLobbyDirect) {
    window.Android.openLobbyDirect("");
    return true;
  }
  if (window.Android?.openLobby) {
    window.Android.openLobby();
    return true;
  }
  return false;
}
