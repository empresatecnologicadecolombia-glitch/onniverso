import type { DocenteCatalogVideoItem } from "@/data/docenteContentCatalog";
import { cloudinaryVideoPosterUrl } from "@/lib/cloudinaryVideoPoster";
import { publicAssetUrl } from "@/lib/publicAssetUrl";

/** Catálogo independiente del panel docente (no usa podcastStreamers ni salaVideoUrls). */
const DOCENTE_ECONOMIA_IA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849172/7_cambios_que_transformar%C3%A1n_la_econom%C3%ADa_antes_de_2030_-_Si_lo_hubiera_sabido_othuus.mp4";

const DOCENTE_IA_ECONOMIA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849097/Por_qu%C3%A9_2026_ser%C3%A1_clave_para_la_Inteligencia_Artificial_y_la_transformaci%C3%B3n_de_la_econom%C3%ADa_global_zv15r3.mp4";

const DOCENTE_IA_ROBOTS_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849180/La_IA_y_los_robots_van_a_provocar_el_mayor_boom_econ%C3%B3mico_de_la_historia_-_Si_lo_hubiera_sabido_qhqwco.mp4";

const DOCENTE_PROGRAMAR_IA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849079/La_forma_CORRECTA_de_programar_con_IA_en_2026__Spec_Driven_Development_a4gaqc.mp4";

const DOCENTE_PROGRAMAR_CHATGPT_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848929/C%C3%B3mo_APRENDER_a_PROGRAMAR_R%C3%81PIDO_usando_ChatGPT_w936db.mp4";

const DOCENTE_INGENIERO_SOFTWARE_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848924/Esto_es_lo_que_debes_estudiar_para_volverte_un_Ingeniero_de_Software_oth404.mp4";

const DOCENTE_USAR_GEMINI_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848858/C%C3%B3mo_Usar_Gemini_AI_de_Google___Tutorial_completo_2024_bu90a0.mp4";

const DOCENTE_PROGRAMAR_CURSOR_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848554/As%C3%AD_Creo_una_Web_con_Cursor_Editor_con_IA_Caso_Real_emhv6v.mp4";

const DOCENTE_CREAR_AGENTE_IA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848842/Como_Crear_un_Agente_de_IA_Aut%C3%B3nomo_Sin_C%C3%B3digo_-_PASO_A_PASO_f3eopn.mp4";

export const DOCENTE_EDUCATIONAL_VIDEOS: DocenteCatalogVideoItem[] = [
  {
    id: "docente-7-cambios-economia-ia",
    title: "7 cambios de la economía gracias a la IA",
    description:
      "Impacto de la inteligencia artificial en la economía global antes de 2030.",
    videoUrl: DOCENTE_ECONOMIA_IA_MP4,
    imageUrl: publicAssetUrl("7-cambios-economia-ia.png"),
    badge: "Economía e IA",
  },
  {
    id: "docente-ia-transformara-economia",
    title: "Por qué la IA transformará la economía",
    description:
      "2026 como punto clave para la inteligencia artificial y la transformación económica global.",
    videoUrl: DOCENTE_IA_ECONOMIA_MP4,
    imageUrl: publicAssetUrl("ia-transformara-economia.png"),
    badge: "Economía e IA",
  },
  {
    id: "docente-ia-y-robots",
    title: "IA y ROBOTS",
    description:
      "La IA y los robots van a provocar el mayor boom económico de la historia.",
    videoUrl: DOCENTE_IA_ROBOTS_MP4,
    imageUrl: publicAssetUrl("ia-y-robots.png"),
    badge: "Economía e IA",
  },
  {
    id: "docente-programar-ia",
    title: "Como programar con IA",
    description:
      "La forma correcta de programar con IA en 2026: Spec Driven Development.",
    videoUrl: DOCENTE_PROGRAMAR_IA_MP4,
    imageUrl: cloudinaryVideoPosterUrl(DOCENTE_PROGRAMAR_IA_MP4),
    badge: "Programación e IA",
  },
  {
    id: "docente-programar-chatgpt",
    title: "Como programar con ChatGPT",
    description: "Cómo aprender a programar rápido usando ChatGPT.",
    videoUrl: DOCENTE_PROGRAMAR_CHATGPT_MP4,
    imageUrl: cloudinaryVideoPosterUrl(DOCENTE_PROGRAMAR_CHATGPT_MP4),
    badge: "Programación e IA",
  },
  {
    id: "docente-ingeniero-software",
    title: "Lo que debes aprender para ser ingeniero de software",
    description:
      "Esto es lo que debes estudiar para volverte un ingeniero de software.",
    videoUrl: DOCENTE_INGENIERO_SOFTWARE_MP4,
    imageUrl: cloudinaryVideoPosterUrl(DOCENTE_INGENIERO_SOFTWARE_MP4),
    badge: "Programación e IA",
  },
  {
    id: "docente-usar-gemini-ia",
    title: "Como usar GEMINI IA",
    description: "Cómo usar Gemini AI de Google: tutorial completo.",
    videoUrl: DOCENTE_USAR_GEMINI_MP4,
    imageUrl: cloudinaryVideoPosterUrl(DOCENTE_USAR_GEMINI_MP4),
    badge: "Programación e IA",
  },
  {
    id: "docente-programar-cursor",
    title: "Como programar con CURSOR",
    description: "Así creo una web con Cursor Editor con IA: caso real.",
    videoUrl: DOCENTE_PROGRAMAR_CURSOR_MP4,
    imageUrl: cloudinaryVideoPosterUrl(DOCENTE_PROGRAMAR_CURSOR_MP4, 12),
    badge: "Programación e IA",
  },
  {
    id: "docente-crear-agente-ia",
    title: "Como crear agente IA",
    description: "Cómo crear un agente de IA autónomo sin código, paso a paso.",
    videoUrl: DOCENTE_CREAR_AGENTE_IA_MP4,
    imageUrl: cloudinaryVideoPosterUrl(DOCENTE_CREAR_AGENTE_IA_MP4, 8),
    badge: "Programación e IA",
  },
];
