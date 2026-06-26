import { EDUCACION_SECTION_PATH, GALERIA_AULA_SECTION_PATH } from "@/lib/aulaVirtual";

export type HomeSocialIconId =
  | "onnivers"
  | "youtube"
  | "educacion"
  | "clase-virtual"
  | "videos-educativos"
  | "google"
  | "mercadolibre"
  | "onniverso";

const CARACOL_TV_URL = "https://www.caracoltv.com/senal-vivo";
const YOUTUBE_HOME_URL = "https://www.youtube.com";
const VIDEOS_EDUCATIVOS_PATH = "/nuestras-salas";
const DOCENTE_PANEL_PATH = "/docente-clases";
const ONNIVERSO_LANDING_PATH = "/";

const DESKTOP_GOOGLE_URL = "https://www.google.com/";

const DESKTOP_SOCIAL_ICON_IDS = new Set<HomeSocialIconId>(["google"]);

/** Iconos de inicio que navegan dentro de la app (sin modal Redes / túnel nativo). */
export const HOME_INTERNAL_SHORTCUT_PATHS: Partial<Record<HomeSocialIconId, string>> = {
  onnivers: DOCENTE_PANEL_PATH,
  educacion: EDUCACION_SECTION_PATH,
  "clase-virtual": GALERIA_AULA_SECTION_PATH,
  "videos-educativos": VIDEOS_EDUCATIVOS_PATH,
  onniverso: ONNIVERSO_LANDING_PATH,
};

export function isHomeInternalShortcut(id: HomeSocialIconId): boolean {
  return id in HOME_INTERNAL_SHORTCUT_PATHS;
}

export function getHomeInternalShortcutPath(id: HomeSocialIconId): string | null {
  return HOME_INTERNAL_SHORTCUT_PATHS[id] ?? null;
}

export type HomeSocialRedesMode = "redes" | "redesCam";

export type HomeSocialIconConfig = {
  id: HomeSocialIconId;
  label: string;
  redesUrl: string;
  redesCamUrl: string;
};

const STORAGE_KEY = "onniverso.homeSocialRedes.v3";

function normalizeCaracolTvUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return CARACOL_TV_URL;
  if (trimmed.includes("play.mercadolibre.com")) return CARACOL_TV_URL;
  if (trimmed.includes("pluto.tv")) return CARACOL_TV_URL;
  return trimmed;
}

function normalizeYouTubeHomeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return YOUTUBE_HOME_URL;
  const lower = trimmed.toLowerCase();
  if (lower.includes("m.youtube.com")) return YOUTUBE_HOME_URL;
  return trimmed;
}

function normalizeDesktopSocialUrl(id: HomeSocialIconId, url: string): string {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (id === "google") {
    if (!trimmed) return DESKTOP_GOOGLE_URL;
    if (lower.includes("m.google.")) return trimmed.replace(/m\.google\./gi, "www.google.");
    return trimmed;
  }
  return trimmed;
}

export const DEFAULT_HOME_SOCIAL_ICONS: HomeSocialIconConfig[] = [
  {
    id: "onnivers",
    label: "Panel docente",
    redesUrl: DOCENTE_PANEL_PATH,
    redesCamUrl: DOCENTE_PANEL_PATH,
  },
  {
    id: "youtube",
    label: "YouTube",
    redesUrl: YOUTUBE_HOME_URL,
    redesCamUrl: YOUTUBE_HOME_URL,
  },
  {
    id: "educacion",
    label: "Educación",
    redesUrl: EDUCACION_SECTION_PATH,
    redesCamUrl: EDUCACION_SECTION_PATH,
  },
  {
    id: "clase-virtual",
    label: "Clase Virtual",
    redesUrl: GALERIA_AULA_SECTION_PATH,
    redesCamUrl: GALERIA_AULA_SECTION_PATH,
  },
  {
    id: "videos-educativos",
    label: "Videos educativos",
    redesUrl: VIDEOS_EDUCATIVOS_PATH,
    redesCamUrl: VIDEOS_EDUCATIVOS_PATH,
  },
  {
    id: "google",
    label: "Google",
    redesUrl: DESKTOP_GOOGLE_URL,
    redesCamUrl: DESKTOP_GOOGLE_URL,
  },
  {
    id: "mercadolibre",
    label: "Caracol TV",
    redesUrl: CARACOL_TV_URL,
    redesCamUrl: CARACOL_TV_URL,
  },
  {
    id: "onniverso",
    label: "OnniVerso",
    redesUrl: ONNIVERSO_LANDING_PATH,
    redesCamUrl: ONNIVERSO_LANDING_PATH,
  },
];

function mergeWithDefaults(parsed: unknown): HomeSocialIconConfig[] {
  if (!Array.isArray(parsed)) return [...DEFAULT_HOME_SOCIAL_ICONS];

  return DEFAULT_HOME_SOCIAL_ICONS.map((def) => {
    const row = parsed.find((p) => p && typeof p === "object" && (p as HomeSocialIconConfig).id === def.id) as
      | Partial<HomeSocialIconConfig>
      | undefined;
    const redesUrl =
      typeof row?.redesUrl === "string" && row.redesUrl.trim() ? row.redesUrl.trim() : def.redesUrl;
    const redesCamUrl =
      typeof row?.redesCamUrl === "string" && row.redesCamUrl.trim() ? row.redesCamUrl.trim() : def.redesCamUrl;

    if (def.id === "onnivers") {
      return { ...def, redesUrl: DOCENTE_PANEL_PATH, redesCamUrl: DOCENTE_PANEL_PATH };
    }

    if (def.id === "onniverso") {
      return { ...def, redesUrl: ONNIVERSO_LANDING_PATH, redesCamUrl: ONNIVERSO_LANDING_PATH };
    }

    if (def.id === "mercadolibre") {
      return {
        ...def,
        redesUrl: normalizeCaracolTvUrl(redesUrl),
        redesCamUrl: normalizeCaracolTvUrl(redesCamUrl),
      };
    }

    if (def.id === "youtube") {
      return {
        ...def,
        redesUrl: normalizeYouTubeHomeUrl(redesUrl),
        redesCamUrl: normalizeYouTubeHomeUrl(redesCamUrl),
      };
    }

    if (DESKTOP_SOCIAL_ICON_IDS.has(def.id)) {
      return {
        ...def,
        redesUrl: normalizeDesktopSocialUrl(def.id, redesUrl),
        redesCamUrl: normalizeDesktopSocialUrl(def.id, redesCamUrl),
      };
    }

    return { ...def, redesUrl, redesCamUrl };
  });
}

export function loadHomeSocialRedesConfig(): HomeSocialIconConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_HOME_SOCIAL_ICONS];
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return [...DEFAULT_HOME_SOCIAL_ICONS];
  }
}

export function saveHomeSocialRedesConfig(icons: HomeSocialIconConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(icons));
}

export function getHomeSocialUrl(icons: HomeSocialIconConfig[], id: HomeSocialIconId, mode: HomeSocialRedesMode) {
  const row = icons.find((i) => i.id === id);
  if (!row) return "";
  return mode === "redes" ? row.redesUrl : row.redesCamUrl;
}

export function updateHomeSocialUrl(
  icons: HomeSocialIconConfig[],
  id: HomeSocialIconId,
  mode: HomeSocialRedesMode,
  url: string,
): HomeSocialIconConfig[] {
  const key = mode === "redes" ? "redesUrl" : "redesCamUrl";
  return icons.map((row) => (row.id === id ? { ...row, [key]: url.trim() } : row));
}
