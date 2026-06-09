/**
 * MP4 de Cloudinary por id de sala (perfil podcast o ruta teatro).
 * Único origen para Nuestras Salas y deep links de reproducción.
 */
const ECONOMIA_IA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849172/7_cambios_que_transformar%C3%A1n_la_econom%C3%ADa_antes_de_2030_-_Si_lo_hubiera_sabido_othuus.mp4";

const IA_TRANSFORMARA_ECONOMIA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849097/Por_qu%C3%A9_2026_ser%C3%A1_clave_para_la_Inteligencia_Artificial_y_la_transformaci%C3%B3n_de_la_econom%C3%ADa_global_zv15r3.mp4";

const IA_Y_ROBOTS_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849180/La_IA_y_los_robots_van_a_provocar_el_mayor_boom_econ%C3%B3mico_de_la_historia_-_Si_lo_hubiera_sabido_qhqwco.mp4";

const PROGRAMAR_IA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780849079/La_forma_CORRECTA_de_programar_con_IA_en_2026__Spec_Driven_Development_a4gaqc.mp4";

const PROGRAMAR_CHATGPT_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848929/C%C3%B3mo_APRENDER_a_PROGRAMAR_R%C3%81PIDO_usando_ChatGPT_w936db.mp4";

const INGENIERO_SOFTWARE_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848924/Esto_es_lo_que_debes_estudiar_para_volverte_un_Ingeniero_de_Software_oth404.mp4";

const USAR_GEMINI_IA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848858/C%C3%B3mo_Usar_Gemini_AI_de_Google___Tutorial_completo_2024_bu90a0.mp4";

const PROGRAMAR_CURSOR_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848554/As%C3%AD_Creo_una_Web_con_Cursor_Editor_con_IA_Caso_Real_emhv6v.mp4";

const CREAR_AGENTE_IA_MP4 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780848842/Como_Crear_un_Agente_de_IA_Aut%C3%B3nomo_Sin_C%C3%B3digo_-_PASO_A_PASO_f3eopn.mp4";

export const SALA_MP4_URL_BY_ID: Record<string, string> = {
  "nova-byte": ECONOMIA_IA_MP4,
  "luisito-comunica-er": IA_TRANSFORMARA_ECONOMIA_MP4,
  "ia-y-robots": IA_Y_ROBOTS_MP4,
  "gopro-gpy": PROGRAMAR_IA_MP4,
  "programar-chatgpt": PROGRAMAR_CHATGPT_MP4,
  "ingeniero-software": INGENIERO_SOFTWARE_MP4,
  "usar-gemini-ia": USAR_GEMINI_IA_MP4,
  "programar-cursor": PROGRAMAR_CURSOR_MP4,
  "crear-agente-ia": CREAR_AGENTE_IA_MP4,
};

export function onniverseDeepLink(mp4Url: string): string {
  return `onniverso://open?url=${encodeURIComponent(mp4Url)}`;
}
