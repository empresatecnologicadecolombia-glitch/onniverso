import {
  hasAndroidNativeBridge,
  invokeOpenLobbyStereoDirect,
} from "@/lib/lobbyOpenDirect";

export const LOBBY_IMMERSIVE_PATH = "/lobby-inmersivo";
export const LOBBY_OPEN_TRANSITION_MS = 320;

/** APK: {@code LobbyVrActivity} estéreo (Tierra / inicio). */
export function openLobbyImmersiveOnAndroid(): boolean {
  return invokeOpenLobbyStereoDirect();
}

export function shouldUseWebLobbyRoute(): boolean {
  return !hasAndroidNativeBridge();
}
