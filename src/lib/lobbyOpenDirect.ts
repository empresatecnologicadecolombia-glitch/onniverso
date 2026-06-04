/** Acción Android (respaldo si {@code modelUrl} no llega). */
export const OPEN_LOBBY_IMMERSIVE_STEREO_ACTION = "OPEN_LOBBY_IMMERSIVE";

export const LOBBY_IMMERSIVE_PRODUCTION_URL = "https://onnivers.com/lobby-inmersivo";

/** Hay puente nativo inyectado por MainActivity (APK). */
export function hasAndroidNativeBridge(): boolean {
  return typeof window.AndroidBridge !== "undefined" || typeof window.Android !== "undefined";
}

/**
 * Tierra en inicio (celular APK): abre {@code LobbyVrActivity} — pantalla dividida + lobby.
 */
export function invokeOpenLobbyStereoDirect(): boolean {
  const lobbyUrl = LOBBY_IMMERSIVE_PRODUCTION_URL;

  if (window.AndroidBridge?.openLobbyStereoSplit) {
    window.AndroidBridge.openLobbyStereoSplit();
    return true;
  }
  if (window.Android?.openLobbyStereoSplit) {
    window.Android.openLobbyStereoSplit();
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

  if (typeof window.AndroidBridge?.openModelDirect === "function") {
    window.AndroidBridge.openModelDirect(lobbyUrl, OPEN_LOBBY_IMMERSIVE_STEREO_ACTION);
    return true;
  }
  if (typeof window.Android?.openModelDirect === "function") {
    window.Android.openModelDirect(lobbyUrl, OPEN_LOBBY_IMMERSIVE_STEREO_ACTION);
    return true;
  }

  if (window.AndroidBridge?.openLobbyImmersiveStereo) {
    window.AndroidBridge.openLobbyImmersiveStereo();
    return true;
  }
  if (window.Android?.openLobbyImmersiveStereo) {
    window.Android.openLobbyImmersiveStereo();
    return true;
  }

  return false;
}
