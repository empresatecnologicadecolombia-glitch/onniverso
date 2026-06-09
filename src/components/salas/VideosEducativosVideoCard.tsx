import { Box, Mic2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  salaRoomCardPadding,
  salaRoomCtaIcon,
  salaRoomDesc,
  salaRoomImageHeight,
  salaRoomImageWrapMb,
  salaRoomOverlayBar,
  salaRoomOverlayIcon,
  salaRoomPrimaryBtn,
  salaRoomStatusBadge,
  salaRoomTitle,
} from "@/components/salas/salaRoomCardStyles";
import {
  VIDEOS_EDUCATIVOS_GRID_CELL_CLASS,
  videosEducativosCardShellClass,
} from "@/components/salas/videosEducativosLayout";

export type VideosEducativosVideoCardProps = {
  id: string;
  name: string;
  image: string;
  subtitle: string;
  description: string;
  online: boolean;
  animationIndex?: number;
  onPlay: () => void;
};

/**
 * Tarjeta única de Videos educativos (/nuestras-salas).
 * Nuevos videos: añadir datos en podcastStreamers.ts; no duplicar markup aquí.
 */
export default function VideosEducativosVideoCard({
  id,
  name,
  image,
  subtitle,
  description,
  online,
  animationIndex = 0,
  onPlay,
}: VideosEducativosVideoCardProps) {
  return (
    <motion.div
      key={id}
      className={VIDEOS_EDUCATIVOS_GRID_CELL_CLASS}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: animationIndex * 0.06 }}
    >
      <article className={`${videosEducativosCardShellClass(online)} ${salaRoomCardPadding}`}>
        <div className={`relative overflow-hidden rounded-xl border border-primary/20 ${salaRoomImageWrapMb}`}>
          <img
            src={image}
            alt={name}
            className={`${salaRoomImageHeight} w-full object-cover transition-transform duration-500 sm:group-hover:scale-105`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
          <div
            className={`absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/45 text-cyan-200 backdrop-blur-md ${salaRoomOverlayBar}`}
          >
            <span className="flex items-center gap-1">
              <Box className={`${salaRoomOverlayIcon} text-primary`} />
              Sala
            </span>
            <span className="text-slate-300">{subtitle}</span>
          </div>
        </div>
        <div className="mb-2 flex items-center justify-between gap-2 sm:gap-3">
          <h3 className={`${salaRoomTitle} truncate`}>{name}</h3>
          {online ? (
            <span className={`${salaRoomStatusBadge} shrink-0 bg-amber-300 text-black`}>EN LÍNEA</span>
          ) : null}
        </div>
        <p className={`mb-3 sm:mb-4 ${salaRoomDesc}`}>{description}</p>
        <Button type="button" variant="heroOutline" className={salaRoomPrimaryBtn} onClick={onPlay}>
          <Mic2 className={salaRoomCtaIcon} />
          Reproducir Video
        </Button>
      </article>
    </motion.div>
  );
}
