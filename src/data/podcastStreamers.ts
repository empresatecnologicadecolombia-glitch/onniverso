import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";
import { cloudinaryVideoPosterUrl } from "@/lib/cloudinaryVideoPoster";

export type StreamStatus = "live" | "offline";
export type StreamType = "platform" | "youtube";

export interface StreamerProfile {
  id: string;
  name: string;
  avatar: string;
  /** Panorama equirectangular único por sala (Lobby 360). */
  panoramaImage: string;
  /** Nombre del entorno inmersivo (ej. Sala Cuántica). */
  immersiveSalaName: string;
  status: StreamStatus;
  streamType?: StreamType;
  youtubeVideoId?: string;
  /** Video de muestra en la sala si no hay YouTube en vivo */
  fallbackVideoId?: string;
  /** MP4 principal (Cloudinary) para pantalla / 360 en la sala inmersiva */
  salaVideoUrl?: string;
  loungeTitle: string;
  loungeDescription: string;
  ticketGrada: number;
  ticketVip: number;
  featuredGames: string[];
}

export const podcastStreamers: StreamerProfile[] = [
  {
    id: "nova-byte",
    name: "7 cambios de la economía gracias a la IA",
    avatar: "/7-cambios-economia-ia.png",
    immersiveSalaName: "Economía e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    fallbackVideoId: "M7lc1UVf-VE",
    salaVideoUrl: SALA_MP4_URL_BY_ID["nova-byte"],
    loungeTitle: "7 cambios de la economía gracias a la IA",
    loungeDescription:
      "Impacto de la inteligencia artificial en la economía global antes de 2030.",
    ticketGrada: 4.99,
    ticketVip: 14.99,
    featuredGames: ["Ajedrez Blitz VR", "TCG Arena Podcast", "Drop Zone Battle"],
  },
  {
    id: "luisito-comunica-er",
    name: "Por qué la IA transformará la economía",
    avatar: "/ia-transformara-economia.png",
    immersiveSalaName: "Economía e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["luisito-comunica-er"],
    fallbackVideoId: "ScMzIvxBSi4",
    loungeTitle: "Por qué la IA transformará la economía",
    loungeDescription:
      "2026 como punto clave para la inteligencia artificial y la transformación económica global.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["Travel Quest VR", "Fan Zone", "Meet & Greet"],
  },
  {
    id: "ia-y-robots",
    name: "IA y ROBOTS",
    avatar: "/ia-y-robots.png",
    immersiveSalaName: "Economía e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["ia-y-robots"],
    fallbackVideoId: "M7lc1UVf-VE",
    loungeTitle: "IA y ROBOTS",
    loungeDescription:
      "La IA y los robots van a provocar el mayor boom económico de la historia.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["Robotics Lab VR", "Fan Zone", "Meet & Greet"],
  },
  {
    id: "gopro-gpy",
    name: "Como programar con IA",
    avatar: cloudinaryVideoPosterUrl(SALA_MP4_URL_BY_ID["gopro-gpy"]),
    immersiveSalaName: "Programación e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["gopro-gpy"],
    fallbackVideoId: "ScMzIvxBSi4",
    loungeTitle: "Como programar con IA",
    loungeDescription:
      "La forma correcta de programar con IA en 2026: Spec Driven Development.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["Action Tour VR", "Fan Zone", "Creator Chat"],
  },
  {
    id: "programar-chatgpt",
    name: "Como programar con ChatGPT",
    avatar: cloudinaryVideoPosterUrl(SALA_MP4_URL_BY_ID["programar-chatgpt"]),
    immersiveSalaName: "Programación e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["programar-chatgpt"],
    fallbackVideoId: "M7lc1UVf-VE",
    loungeTitle: "Como programar con ChatGPT",
    loungeDescription:
      "Cómo aprender a programar rápido usando ChatGPT.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["Code Lab VR", "Fan Zone", "Creator Chat"],
  },
  {
    id: "ingeniero-software",
    name: "Lo que debes aprender para ser ingeniero de software",
    avatar: cloudinaryVideoPosterUrl(SALA_MP4_URL_BY_ID["ingeniero-software"]),
    immersiveSalaName: "Programación e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["ingeniero-software"],
    fallbackVideoId: "M7lc1UVf-VE",
    loungeTitle: "Lo que debes aprender para ser ingeniero de software",
    loungeDescription:
      "Esto es lo que debes estudiar para volverte un ingeniero de software.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["Dev Path VR", "Fan Zone", "Creator Chat"],
  },
  {
    id: "usar-gemini-ia",
    name: "Como usar GEMINI IA",
    avatar: cloudinaryVideoPosterUrl(SALA_MP4_URL_BY_ID["usar-gemini-ia"]),
    immersiveSalaName: "Programación e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["usar-gemini-ia"],
    fallbackVideoId: "M7lc1UVf-VE",
    loungeTitle: "Como usar GEMINI IA",
    loungeDescription:
      "Cómo usar Gemini AI de Google: tutorial completo.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["AI Lab VR", "Fan Zone", "Creator Chat"],
  },
  {
    id: "programar-cursor",
    name: "Como programar con CURSOR",
    avatar: cloudinaryVideoPosterUrl(SALA_MP4_URL_BY_ID["programar-cursor"]),
    immersiveSalaName: "Programación e IA",
    panoramaImage:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["programar-cursor"],
    fallbackVideoId: "M7lc1UVf-VE",
    loungeTitle: "Como programar con CURSOR",
    loungeDescription:
      "Así creo una web con Cursor Editor con IA: caso real.",
    ticketGrada: 0,
    ticketVip: 0,
    featuredGames: ["Code Lab VR", "Fan Zone", "Creator Chat"],
  },
];

export function resolvePodcastVideoId(s: StreamerProfile): string {
  if (s.streamType === "youtube" && s.youtubeVideoId) return s.youtubeVideoId;
  if (s.fallbackVideoId) return s.fallbackVideoId;
  return s.youtubeVideoId ?? "M7lc1UVf-VE";
}
