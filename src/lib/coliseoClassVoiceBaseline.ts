import { buildAgoraChannel } from "@/lib/agoraRooms";

/**
 * Baseline congelado (jun 2026): clase Coliseo 360 + voz Agora + presencia Supabase + APK.
 * Regla del agente: `.cursor/rules/coliseo-class-voice-frozen.mdc`
 */
export const COLISEO_CLASS_VOICE_BASELINE_VERSION = "2026-06-validated" as const;

export const COLISEO_CLASS_QUERY_PARAM = "class" as const;

/** Flujo de entrada alumno → Coliseo (no cambiar sin petición explícita). */
export const COLISEO_CLASS_ENTRY_FLOW = {
  nativeFirst: true,
  stashBeforeOpen: true,
  allowNativeForClassSessions: true,
  fallbackWebNavigate: true,
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
