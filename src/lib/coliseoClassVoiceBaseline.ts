import { buildAgoraChannel } from "@/lib/agoraRooms";
import { coliseoCameraGuideChannelName } from "@/lib/coliseoDocenteGuide";

/**
 * Baseline congelado (jun 2026): clase Coliseo 360 + voz Agora + presencia Supabase + APK.
 * Regla del agente: `.cursor/rules/coliseo-class-live-frozen.mdc`
 */
export const COLISEO_CLASS_VOICE_BASELINE_VERSION = "2026-06-11-validated" as const;

export const COLISEO_CLASS_QUERY_PARAM = "class" as const;

/** Flujo de entrada alumno → Coliseo (no cambiar sin petición explícita). */
export const COLISEO_CLASS_ENTRY_FLOW = {
  nativeFirst: true,
  stashBeforeOpen: true,
  allowNativeForClassSessions: true,
  fallbackWebNavigate: true,
} as const;

/** Polling / reintentos en `/clase/:slug` (jun 2026 — validado APK + PC). */
export const COLISEO_CLASS_ENTRY_POLL = {
  liveSessionMs: 3000,
  aulaRetryMs: 2500,
  authSessionWaitMs: 4000,
  authSessionPollMs: 200,
  aulaLookupFailThreshold: 4,
} as const;

/** Sincronización docente → alumnos: play/pausa/siguiente/anterior en pantalla MP4. */
export const COLISEO_CLASS_VIDEO_SYNC = {
  event: "video-control",
} as const;

/** Sincronización docente → alumnos: 3 puntos de vista 360 (video / GLB / PDF). */
export const COLISEO_CLASS_GUIDE_SYNC = {
  event: "camera-guide",
  broadcastRetries: 4,
  sendRetryMs: 200,
  subscribeTimeoutMs: 8000,
  usePresenceReplay: true,
} as const;

/** Control docente → alumno: grant/revoke mic en clase (canal aparte de Agora). */
export const COLISEO_CLASS_VOICE_CONTROL = {
  event: "voice-control",
} as const;

export function normalizeClassSlug(classSlug: string): string {
  return classSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}

export function buildClassVoiceAgoraChannel(classSlug: string): string {
  const slug = normalizeClassSlug(classSlug);
  return buildAgoraChannel(`class-voice-${slug || "main"}`);
}

export function buildClassVoicePresenceChannel(classSlug: string): string {
  return `class-voice-presence-${buildClassVoiceAgoraChannel(classSlug)}`;
}

export function buildClassVoiceControlChannel(classSlug: string): string {
  const slug = normalizeClassSlug(classSlug);
  return `class-voice-control-${slug || "main"}`;
}

export function buildClassVideoSyncChannel(classSlug: string): string {
  const slug = normalizeClassSlug(classSlug);
  return `class-video-sync-${slug || "main"}`;
}

export { coliseoCameraGuideChannelName as buildClassCameraGuideChannel };

export function resolveColiseoLaunchUrl(classPageUrl?: string): string {
  const raw = classPageUrl?.trim() ?? "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }
  return raw;
}

export function classUrlHasClassParam(classUrl: string): boolean {
  return classUrl.includes(`${COLISEO_CLASS_QUERY_PARAM}=`);
}

/** Canales Supabase Realtime de clase — tabla de referencia para tests y agente. */
export const COLISEO_CLASS_LIVE_CHANNELS = {
  voiceAgora: buildClassVoiceAgoraChannel,
  voicePresence: buildClassVoicePresenceChannel,
  voiceControl: buildClassVoiceControlChannel,
  videoSync: buildClassVideoSyncChannel,
  cameraGuide: coliseoCameraGuideChannelName,
} as const;
