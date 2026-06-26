import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { podcastStreamers } from "@/data/podcastStreamers";
import { supabase } from "@/integrations/supabase/client";
import {
  audienceStreamSessionKey,
  isStreamPlaybackUrl,
  resolvePlaybackIdFromActiveStreamRow,
} from "@/lib/audiencePlayback";
import { muxPlaybackIdFromHlsUrl } from "@/lib/muxPlaybackId";
import { handoffSalaCardOnAndroid } from "@/lib/salaOpenDirect";
import { handoffAudienceLiveCardOnAndroid } from "@/lib/liveStreamOpenDirect";
import { fetchPublishedConciertoCards, isConciertoRoomCard } from "@/lib/conciertoLiveCard";
import {
  fetchPublishedDocenteTarjetas,
  tarjetaToRoomCard,
} from "@/lib/docenteConocimientoTarjetas";
import { getRoomActiveStream, type ActiveStreamRow, type RoomCard } from "@/lib/salaRoomCards";
import { shuffleArray } from "@/lib/shuffleArray";
import { handleStreamCardPlay } from "@/lib/streamCardNavigation";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { toast } from "sonner";
import { isUserLiveStreamingEnabled } from "@/config/liveStreaming";
import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";
import { useSalaChoiceModal } from "@/hooks/useSalaChoiceModal";
import { useLiveStreamChoiceModal } from "@/hooks/useLiveStreamChoiceModal";
import VideosEducativosPageShell from "@/components/salas/VideosEducativosPageShell";
import VideosEducativosVideoCard from "@/components/salas/VideosEducativosVideoCard";

/** Tarjeta de prueba Conciertos Live: no mostrar en el grid de Nuestras Salas (el perfil no se modifica). */
function isExcludedTestConciertoCardInSalasGrid(room: RoomCard): boolean {
  if (!isConciertoRoomCard(room)) return false;
  const titleKey = room.name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "");
  return titleKey === "davis2";
}

const NuestrasSalasPage = () => {
  const navigate = useNavigate();
  const [userConciertoRooms, setUserConciertoRooms] = useState<RoomCard[]>([]);
  const [docenteTarjetaRooms, setDocenteTarjetaRooms] = useState<RoomCard[]>([]);
  const [activeStreams, setActiveStreams] = useState<ActiveStreamRow[]>([]);
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const { requestSalaChoice, dialog: salaChoiceDialog } = useSalaChoiceModal();
  const { requestChoice: requestLiveStreamChoice, dialog: liveStreamChoiceDialog } = useLiveStreamChoiceModal();

  useEffect(() => {
    const loadData = async () => {
      const [conciertoRooms, publishedTarjetas] = await Promise.all([
        isUserLiveStreamingEnabled() ? fetchPublishedConciertoCards() : Promise.resolve([] as RoomCard[]),
        fetchPublishedDocenteTarjetas().catch(() => []),
      ]);

      let activeData: ActiveStreamRow[] = [];
      if (isUserLiveStreamingEnabled()) {
        const { data } = await supabase
          .from("active_streams")
          .select("user_id,is_live,title,stream_url,playback_url,playback_id,privacy_mode,ticket_price,updated_at")
          .eq("is_live", true);
        activeData = (data ?? []) as ActiveStreamRow[];
      }

      setActiveStreams(activeData);
      setUserConciertoRooms(conciertoRooms);
      setDocenteTarjetaRooms(publishedTarjetas.map(tarjetaToRoomCard));
    };

    void loadData();

    if (!isUserLiveStreamingEnabled()) {
      return;
    }

    const channel = supabase
      .channel("public:nuestras-salas")
      .on("postgres_changes", { event: "*", schema: "public", table: "active_streams" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const creatorRooms: RoomCard[] = useMemo(() => {
    const streamerRooms = podcastStreamers.map((streamer) => ({
      id: streamer.id,
      name: streamer.name,
      image: streamer.avatar,
      subtitle: streamer.immersiveSalaName,
      description: streamer.loungeTitle,
      status: streamer.status === "live" ? "En Vivo" : "Offline",
      channel: buildAgoraChannel(streamer.id),
      isPremium: false,
      priceUsd: 0,
      mp4Url: SALA_MP4_URL_BY_ID[streamer.id],
    }));
    const publishedConciertoRooms = userConciertoRooms.filter(
      (room) => !isExcludedTestConciertoCardInSalasGrid(room),
    );
    return [...docenteTarjetaRooms, ...publishedConciertoRooms, ...shuffleArray(streamerRooms)];
  }, [docenteTarjetaRooms, userConciertoRooms]);

  const beginRoomSession = async (
    room: RoomCard,
    activeStream?: ActiveStreamRow | null,
    options?: { fromSalaCard?: boolean },
  ) => {
    const fromSalaCard = Boolean(options?.fromSalaCard);
    const audienceTappedLive = fromSalaCard || Boolean(activeStream?.is_live);
    const useLoadingOverlay = !fromSalaCard;
    if (useLoadingOverlay) setLoadingRoomId(room.id);
    try {
      const streamUrlCandidate = activeStream?.stream_url?.trim() || "";
      const playbackUrlCandidate = activeStream?.playback_url?.trim() || "";
      const resolvedChannel = isStreamPlaybackUrl(streamUrlCandidate) ? room.channel : streamUrlCandidate || room.channel;
      const resolvedToken =
        playbackUrlCandidate && !isStreamPlaybackUrl(playbackUrlCandidate) ? playbackUrlCandidate : "";
      const resolvedTitle = activeStream?.title?.trim() || room.name;

      if (isConciertoRoomCard(room)) {
        if (handoffAudienceLiveCardOnAndroid(activeStream, resolvedTitle, requestLiveStreamChoice, audienceTappedLive)) {
          return;
        }
      } else if (handoffSalaCardOnAndroid(room, activeStream, resolvedTitle, requestSalaChoice)) {
        return;
      }

      if (activeStream?.is_live) {
        if (!isUserLiveStreamingEnabled()) {
          toast.info("La transmisión en vivo por usuarios no está disponible.");
          if (room.mp4Url) {
            beginRoomSession(room, null, { fromSalaCard: true });
          }
          return;
        }
        const muxPlaybackId =
          resolvePlaybackIdFromActiveStreamRow(activeStream) ??
          muxPlaybackIdFromHlsUrl(playbackUrlCandidate) ??
          muxPlaybackIdFromHlsUrl(streamUrlCandidate);
        const hlsUrl =
          playbackUrlCandidate && isStreamPlaybackUrl(playbackUrlCandidate)
            ? playbackUrlCandidate
            : streamUrlCandidate && isStreamPlaybackUrl(streamUrlCandidate)
              ? streamUrlCandidate
              : "";
        if (
          handleStreamCardPlay({
            navigate,
            streamUrl: hlsUrl || undefined,
            streamId: muxPlaybackId ?? resolvedChannel,
            playbackId: muxPlaybackId ?? undefined,
            title: resolvedTitle,
          })
        ) {
          return;
        }
        toast.error("No se pudo abrir el stream en vivo.");
        return;
      }

      const params = new URLSearchParams();
      const resolvedStreamUrl = [playbackUrlCandidate, streamUrlCandidate].find((value) => isStreamPlaybackUrl(value)) ?? "";

      if (room.mp4Url) params.set("mp4", room.mp4Url);
      params.set("title", resolvedTitle);
      params.set("mode", room.mp4Url && !activeStream?.is_live ? "vod" : "live");
      if (resolvedToken) params.set("token", resolvedToken);
      if (resolvedStreamUrl) {
        params.set("stream", resolvedStreamUrl);
        try {
          sessionStorage.setItem(audienceStreamSessionKey(resolvedChannel), resolvedStreamUrl);
        } catch {
          /* sessionStorage no disponible */
        }
      }
      const muxPlaybackId = resolvePlaybackIdFromActiveStreamRow(activeStream);
      if (muxPlaybackId) params.set("playbackId", muxPlaybackId);
      const path = `/sala/espectador/${encodeURIComponent(resolvedChannel)}?${params.toString()}`;
      navigate(path);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo abrir la sala.";
      toast.error(msg);
    } finally {
      setLoadingRoomId(null);
    }
  };

  const handleRoomAccess = (room: RoomCard, online: boolean) => {
    const linkedStream = getRoomActiveStream(room, activeStreams);
    if (!online && room.mp4Url) {
      beginRoomSession(room, linkedStream, { fromSalaCard: true });
      return;
    }
    if (!online) {
      toast.info("Esta sala no está en línea en este momento.");
      return;
    }
    beginRoomSession(room, linkedStream, { fromSalaCard: true });
  };

  return (
    <>
      <VideosEducativosPageShell>
        {creatorRooms.map((room, index) => {
          const linkedStream = getRoomActiveStream(room, activeStreams);
          const online = Boolean(linkedStream?.is_live);
          return (
            <VideosEducativosVideoCard
              key={room.id}
              id={room.id}
              name={room.name}
              image={room.image}
              subtitle={room.subtitle}
              description={room.description}
              online={online}
              animationIndex={index}
              onPlay={() => handleRoomAccess(room, online)}
            />
          );
        })}
      </VideosEducativosPageShell>

      {salaChoiceDialog}
      {liveStreamChoiceDialog}

      <AnimatePresence>
        {loadingRoomId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-background/92 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.8 }}
              className="rounded-2xl border border-cyan-300/40 bg-card/40 px-8 py-6 text-center shadow-[0_0_55px_-16px_rgba(34,211,238,0.95)]"
            >
              <p className="font-display text-lg font-bold text-cyan-100">Entrando a la sala...</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-200">al universo loading sequence</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NuestrasSalasPage;
