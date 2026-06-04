/** Acción Android (respaldo si {@code modelUrl} no llega). */
export const OPEN_LOBBY_IMMERSIVE_STEREO_ACTION = "OPEN_LOBBY_IMMERSIVE";

/** URL fija que carga {@code AulaVirtualActivity} en pantalla dividida (Tierra). */
export const LOBBY_IMMERSIVE_PRODUCTION_URL = "https://onnivers.com/lobby-inmersivo";

/** Hay puente nativo inyectado por MainActivity (APK). */
export function hasAndroidNativeBridge(): boolean {
  return typeof window.AndroidBridge !== "undefined" || typeof window.Android !== "undefined";
}

/**
 * Tierra (APK): mismo visor estéreo que birrete «Lobby VR estéreo (nativo)»,
 * con {@link LOBBY_IMMERSIVE_PRODUCTION_URL} en el WebView dividido.
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

  // Mismo puente que el birrete; la URL va en modelUrl por si action no llega por JNI.
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
