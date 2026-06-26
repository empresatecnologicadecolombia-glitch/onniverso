/** Clave legacy (compartida entre cuentas en el mismo navegador — no usar). */
const LEGACY_PROFILE_NAME_KEY = "onniverso.profile.name";

const profileNameKey = (userId: string) => `onniverso.profile.name.${userId}`;

/** Nombre guardado en este dispositivo para un usuario concreto. */
export function readStoredProfileName(userId: string | undefined): string | undefined {
  if (!userId || typeof window === "undefined") return undefined;
  try {
    const scoped = localStorage.getItem(profileNameKey(userId))?.trim();
    if (scoped) return scoped;

    const legacy = localStorage.getItem(LEGACY_PROFILE_NAME_KEY)?.trim();
    if (legacy) {
      localStorage.setItem(profileNameKey(userId), legacy);
      localStorage.removeItem(LEGACY_PROFILE_NAME_KEY);
      return legacy;
    }
  } catch {
    /* quota / modo privado */
  }
  return undefined;
}

export function writeStoredProfileName(userId: string, name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(profileNameKey(userId), trimmed);
    localStorage.removeItem(LEGACY_PROFILE_NAME_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredProfileName(userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_PROFILE_NAME_KEY);
    if (userId) localStorage.removeItem(profileNameKey(userId));
  } catch {
    /* ignore */
  }
}

export function resolveProfileDisplayName(params: {
  profileFullName?: string | null;
  userId?: string;
  metadataFullName?: string | null;
  email?: string | null;
  fallback?: string;
}): string {
  const fallback = params.fallback?.trim() || "Explorador VR";
  const fromDb = params.profileFullName?.trim();
  if (fromDb) return fromDb;

  const fromDevice = readStoredProfileName(params.userId);
  if (fromDevice) return fromDevice;

  const fromMeta = params.metadataFullName?.trim();
  if (fromMeta) return fromMeta;

  const emailPrefix = params.email?.split("@")[0]?.trim();
  if (emailPrefix) return emailPrefix;

  return fallback;
}
