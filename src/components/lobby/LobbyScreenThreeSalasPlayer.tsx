import { memo, useCallback, useEffect, useRef, useState } from "react";
import { getLobbySalaVideoPlaylist } from "@/lib/lobbySalaVideoPlaylist";
import { resolveLocalVideoUrl, type LocalVideoItem } from "@/lib/lobbyLocalVideoPicker";

function defaultPlaylistItems(): LocalVideoItem[] {
  return getLobbySalaVideoPlaylist().map((item) => ({
    kind: "url",
    id: item.id,
    name: item.name,
    url: item.url,
  }));
}

/**
 * Pantalla de videos educativos en lobby (PC + APK).
 * Usa &lt;video&gt; HTML en todas las plataformas: el slot nativo Android
 * (WebView aparte) dejaba pantalla negra al no cargar la playlist MP4.
 */
export const LobbyScreenThreeSalasPlayer = memo(function LobbyScreenThreeSalasPlayer({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
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
            /* autoplay bloqueado hasta interacción (típico en APK) */
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

  /** Si Android dejó un WebView nativo de pantalla 2, ocultarlo para no tapar el video HTML. */
  useEffect(() => {
    try {
      window.Android?.hideLobbyPantalla2WebView?.();
    } catch {
      /* ignore */
    }
    return () => {
      try {
        window.Android?.hideLobbyPantalla2WebView?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

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
        preload="auto"
        // Sin crossOrigin: en WebView Android suele romper MP4 Cloudinary (pantalla negra).
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
