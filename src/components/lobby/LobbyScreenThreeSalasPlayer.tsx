import { memo, useCallback, useEffect, useRef, useState } from "react";
import { getLobbySalaVideoPlaylist } from "@/lib/lobbySalaVideoPlaylist";
import { resolveLocalVideoUrl, type LocalVideoItem } from "@/lib/lobbyLocalVideoPicker";

declare global {
  interface Window {
    __onniversoGetNativeWebViewSlotRect?: (slotId?: string) => { x: number; y: number; w: number; h: number } | null;
    __onniversoGetLobbyScreen2Rect?: () => { x: number; y: number; w: number; h: number } | null;
    Android?: {
      showLobbyPantalla2WebView?(): void;
      hideLobbyPantalla2WebView?(): void;
      updateLobbyBounds?(): void;
      loadLobbyPantalla2Url?(url: string): void;
    };
  }
}

const LOBBY_NATIVE_WEBVIEW_SLOT_ID = "lobby-screen-2";
const LOBBY_NATIVE_WEBVIEW_SLOT_LEGACY_ID = "onni-native-webview-lobby-screen-2";
const LOBBY_SALAS_PLAYER_PATH = "/lobby-salas-player.html";

function defaultPlaylistItems(): LocalVideoItem[] {
  return getLobbySalaVideoPlaylist().map((item) => ({
    kind: "url" as const,
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

function buildNativePlayerUrl(items: LocalVideoItem[]): string {
  const payload = items.map((item) => ({ id: item.id, name: item.name, url: item.url }));
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  // Capacitor sirve public/ en https://localhost/
  return `https://localhost${LOBBY_SALAS_PLAYER_PATH}#b64=${encodeURIComponent(b64)}`;
}

/**
 * Pantalla de videos educativos en lobby.
 * - PC / navegador: &lt;video&gt; HTML.
 * - APK: WebView nativo encima del slot 3D (mismo muro, sin decodificar MP4 dentro de Three.js).
 */
export const LobbyScreenThreeSalasPlayer = memo(function LobbyScreenThreeSalasPlayer({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const nativeSlotRef = useRef<HTMLDivElement | null>(null);
  const isNativeAndroidSlot = isNativeAndroidLobby();
  const playlistRef = useRef<LocalVideoItem[]>(defaultPlaylistItems());

  // Android: mostrar WebView nativo con player liviano + playlist.
  useEffect(() => {
    if (!isNativeAndroidSlot) return;
    const android = window.Android;
    if (!android) return;

    const url = buildNativePlayerUrl(playlistRef.current);
    try {
      if (typeof android.loadLobbyPantalla2Url === "function") {
        android.loadLobbyPantalla2Url(url);
      } else {
        android.showLobbyPantalla2WebView?.();
      }
      android.updateLobbyBounds?.();
    } catch {
      /* ignore */
    }

    const sync = () => {
      try {
        window.Android?.updateLobbyBounds?.();
      } catch {
        /* ignore */
      }
    };
    sync();
    window.requestAnimationFrame(sync);
    const retryIds = [120, 300, 600, 1200, 2400].map((ms) => window.setTimeout(sync, ms));
    const intervalId = window.setInterval(sync, 250);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      retryIds.forEach((id) => window.clearTimeout(id));
      window.clearInterval(intervalId);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      try {
        window.Android?.hideLobbyPantalla2WebView?.();
      } catch {
        /* ignore */
      }
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
      if (window.__onniversoGetLobbyScreen2Rect === getRect) {
        delete window.__onniversoGetLobbyScreen2Rect;
      }
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
          background: "#02030a",
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

  return <LobbyHtmlVideoPlayer width={width} height={height} />;
});

function LobbyHtmlVideoPlayer({ width, height }: { width: number; height: number }) {
  const [playlist] = useState<LocalVideoItem[]>(() => defaultPlaylistItems());
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);

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
        video.pause();
        video.removeAttribute("src");
        video.src = url;
        video.load();
        if (autoplay) {
          try {
            await video.play();
          } catch {
            /* autoplay bloqueado */
          }
        }
      } catch {
        /* ignore */
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
        controlsList="nodownload"
        preload="metadata"
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
}
