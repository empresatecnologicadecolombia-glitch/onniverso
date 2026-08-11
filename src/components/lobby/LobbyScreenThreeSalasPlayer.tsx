import { memo, useCallback, useEffect, useRef, useState } from "react";
import { getLobbySalaVideoPlaylist } from "@/lib/lobbySalaVideoPlaylist";
import { resolveLocalVideoUrl, type LocalVideoItem } from "@/lib/lobbyLocalVideoPicker";

declare global {
  interface Window {
    __onniversoGetNativeWebViewSlotRect?: (slotId?: string) => { x: number; y: number; w: number; h: number } | null;
    __onniversoGetLobbyScreen2Rect?: () => { x: number; y: number; w: number; h: number } | null;
  }
}

const LOBBY_NATIVE_WEBVIEW_SLOT_ID = "lobby-screen-2";
const LOBBY_NATIVE_WEBVIEW_SLOT_LEGACY_ID = "onni-native-webview-lobby-screen-2";

function defaultPlaylistItems(): LocalVideoItem[] {
  return getLobbySalaVideoPlaylist().map((item) => ({
    kind: "url",
    id: item.id,
    name: item.name,
    url: item.url,
  }));
}

function isNativeAndroidLobby(): boolean {
  return (
    typeof window !== "undefined" &&
    (typeof window.Android !== "undefined" || typeof window.AndroidBridge !== "undefined")
  );
}

export const LobbyScreenThreeSalasPlayer = memo(function LobbyScreenThreeSalasPlayer({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const nativeSlotRef = useRef<HTMLDivElement | null>(null);
  const isNativeAndroidSlot = isNativeAndroidLobby();

  // Android: WebView nativo encima del slot 3D (show + updateBounds como cuando funcionaba).
  useEffect(() => {
    if (!isNativeAndroidSlot) return;
    const sync = () => {
      if (!window.Android) return;
      window.Android.showLobbyPantalla2WebView?.();
      window.Android.updateLobbyBounds?.();
    };
    sync();
    window.requestAnimationFrame(sync);
    const retryIds = [120, 300, 600, 1200, 2400].map((ms) => window.setTimeout(sync, ms));
    const intervalId = window.setInterval(sync, 200);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      retryIds.forEach((id) => window.clearTimeout(id));
      window.clearInterval(intervalId);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.Android?.hideLobbyPantalla2WebView?.();
    };
  }, [isNativeAndroidSlot]);

  useEffect(() => {
    if (!isNativeAndroidSlot) return;
    const getRect = () => {
      const el =
        document.getElementById(LOBBY_NATIVE_WEBVIEW_SLOT_ID) ??
        document.getElementById(LOBBY_NATIVE_WEBVIEW_SLOT_LEGACY_ID) ??
        nativeSlotRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return null;
      return {
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    window.__onniversoGetLobbyScreen2Rect = getRect;
    window.__onniversoGetNativeWebViewSlotRect = (slotId?: string) => {
      if (
        slotId &&
        slotId !== LOBBY_NATIVE_WEBVIEW_SLOT_ID &&
        slotId !== LOBBY_NATIVE_WEBVIEW_SLOT_LEGACY_ID
      ) {
        return null;
      }
      return getRect();
    };
    return () => {
      nativeSlotRef.current = null;
    };
  }, [isNativeAndroidSlot]);

  if (isNativeAndroidSlot) {
    return (
      <div
        ref={nativeSlotRef}
        id={LOBBY_NATIVE_WEBVIEW_SLOT_ID}
        data-native-webview-slot={LOBBY_NATIVE_WEBVIEW_SLOT_ID}
        style={{
          width,
          height,
          background: "transparent",
          borderRadius: 10,
          border: "1px solid rgba(34,211,238,0.2)",
          boxSizing: "border-box",
          userSelect: "none",
          pointerEvents: "none",
        }}
        aria-hidden
      />
    );
  }

  const [playlist] = useState<LocalVideoItem[]>(() => defaultPlaylistItems());
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const current = playlist.length > 0 ? playlist[index % playlist.length] : null;

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const loadItemAt = useCallback(
    async (nextIndex: number, autoplay: boolean) => {
      if (!playlist.length) return;
      const item = playlist[nextIndex % playlist.length];
      const video = videoRef.current;
      if (!video) return;

      revokeObjectUrl();
      try {
        const url = await resolveLocalVideoUrl(item);
        if (item.kind !== "url") objectUrlRef.current = url;
        video.src = url;
        video.load();
        if (autoplay) {
          try {
            await video.play();
          } catch {
            /* autoplay bloqueado hasta interacción */
          }
        }
      } catch {
        /* ignore load errors */
      }
    },
    [playlist, revokeObjectUrl],
  );

  useEffect(() => {
    if (!playlist.length) return;
    void loadItemAt(0, false);
  }, [playlist, loadItemAt]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const onNext = useCallback(() => {
    if (!playlist.length) return;
    const next = (index + 1) % playlist.length;
    setIndex(next);
    void loadItemAt(next, true);
  }, [index, playlist.length, loadItemAt]);

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        background: "#02030a",
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
        contain: "strict",
      }}
    >
      <video
        ref={videoRef}
        playsInline
        controls
        preload="metadata"
        crossOrigin={current?.kind === "url" ? "anonymous" : undefined}
        onEnded={() => void onNext()}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "#000",
          borderRadius: 8,
          border: "1px solid rgba(34,211,238,0.35)",
          display: "block",
        }}
      />
    </div>
  );
});
