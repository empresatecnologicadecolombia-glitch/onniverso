/** Acción Android: mismo puente que el birrete, pero carga /lobby-inmersivo en estéreo. */
export const OPEN_LOBBY_IMMERSIVE_STEREO_ACTION = "OPEN_LOBBY_IMMERSIVE";

/** Hay puente nativo inyectado por MainActivity (APK). */
export function hasAndroidNativeBridge(): boolean {
  return typeof window.AndroidBridge !== "undefined" || typeof window.Android !== "undefined";
}

function callNativeOpenLobbyLegacy(clipUrl: string): boolean {
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
 * Tierra en inicio (APK): mismo mecanismo estéreo que el birrete Aula Virtual
 * ({@code openModelDirect} → actividad nativa con {@link StereoContainer}), ruta lobby.
 */
export function invokeOpenLobbyStereoDirect(): boolean {
  if (window.AndroidBridge?.openModelDirect) {
    window.AndroidBridge.openModelDirect("", OPEN_LOBBY_IMMERSIVE_STEREO_ACTION);
    return true;
  }
  if (window.Android?.openModelDirect) {
    window.Android.openModelDirect("", OPEN_LOBBY_IMMERSIVE_STEREO_ACTION);
    return true;
  }
  return callNativeOpenLobbyLegacy("");
}
