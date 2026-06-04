/** Misma acción que interpreta {@code deliverModelDirectToNative} en MainActivity. */
export const OPEN_LOBBY_IMMERSIVE_STEREO_ACTION = "OPEN_LOBBY_IMMERSIVE";

export const LOBBY_IMMERSIVE_PRODUCTION_URL = "https://onnivers.com/lobby-inmersivo";

/** Hay puente nativo inyectado por MainActivity (APK). */
export function hasAndroidNativeBridge(): boolean {
  return typeof window.AndroidBridge !== "undefined" || typeof window.Android !== "undefined";
}

/**
 * Tierra en inicio (APK): **mismo clip/estéreo que el birrete** «Lobby VR estéreo (nativo)»
 * ({@code openModelDirect} → {@code AulaVirtualActivity} + {@code StereoContainer}), URL lobby.
 */
export function invokeOpenLobbyStereoDirect(): boolean {
  if (typeof window.AndroidBridge?.openModelDirect === "function") {
    window.AndroidBridge.openModelDirect("", OPEN_LOBBY_IMMERSIVE_STEREO_ACTION);
    return true;
  }
  if (typeof window.Android?.openModelDirect === "function") {
    window.Android.openModelDirect("", OPEN_LOBBY_IMMERSIVE_STEREO_ACTION);
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
