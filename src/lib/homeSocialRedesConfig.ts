import { SOCIAL_LINKS } from "@/components/SocialFooterIcons";

export type HomeSocialIconId =
  | "onnivers"
  | "youtube"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "google"
  | "mercadolibre"
  | "whatsapp";

const ONNIVERS_SITE_URL = "https://onnivers.com/";
const LEGACY_ONNIVERS_LOBBY_PATH = "/lobby-inmersivo";
const CARACOL_TV_URL = "https://www.caracoltv.com/senal-vivo";
const YOUTUBE_STEREO_URL = "https://m.youtube.com/";

export type HomeSocialRedesMode = "redes" | "redesCam";

export type HomeSocialIconConfig = {
  id: HomeSocialIconId;
  label: string;
  redesUrl: string;
  redesCamUrl: string;
};

const STORAGE_KEY = "onniverso.homeSocialRedes.v1";

/** Sitio genérico; sin chat a un número concreto (configurable en Redes / Redes Cam). */
const WHATSAPP_DEFAULT = "https://web.whatsapp.com";

/** wa.me del desarrollador — no debe persistir como destino global del icono en inicio. */
const LEGACY_HOME_WHATSAPP_PERSONAL = "573117486855";

function normalizeHomeWhatsAppUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes(LEGACY_HOME_WHATSAPP_PERSONAL)) return WHATSAPP_DEFAULT;
  return trimmed;
}

function normalizeOnniversHomeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes(LEGACY_ONNIVERS_LOBBY_PATH)) return ONNIVERS_SITE_URL;
  return trimmed;
}

function normalizeCaracolTvUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return CARACOL_TV_URL;
  if (trimmed.includes("play.mercadolibre.com")) return CARACOL_TV_URL;
  if (trimmed.includes("pluto.tv")) return CARACOL_TV_URL;
  return trimmed;
}

function normalizeYouTubeStereoUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return YOUTUBE_STEREO_URL;
  const lower = trimmed.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return YOUTUBE_STEREO_URL;
  return trimmed;
}

/** YouTube en APK estéreo: usar m.youtube.com (WebView), no www. */
export function normalizeHomeSocialCineUrl(id: HomeSocialIconId, url: string): string {
  if (id === "youtube") return normalizeYouTubeStereoUrl(url);
  return url.trim();
}

export const DEFAULT_HOME_SOCIAL_ICONS: HomeSocialIconConfig[] = [
  {
    id: "onnivers",
    label: "OnniVers",
    redesUrl: ONNIVERS_SITE_URL,
    redesCamUrl: ONNIVERS_SITE_URL,
  },
  {
    id: "youtube",
    label: "YouTube",
    redesUrl: YOUTUBE_STEREO_URL,
    redesCamUrl: YOUTUBE_STEREO_URL,
  },
  {
    id: "facebook",
    label: "Facebook",
    redesUrl: SOCIAL_LINKS.facebook,
    redesCamUrl: SOCIAL_LINKS.facebook,
  },
  {
    id: "instagram",
    label: "Instagram",
    redesUrl: SOCIAL_LINKS.instagram,
    redesCamUrl: SOCIAL_LINKS.instagram,
  },
  {
    id: "tiktok",
    label: "TikTok",
    redesUrl: SOCIAL_LINKS.tiktok,
    redesCamUrl: SOCIAL_LINKS.tiktok,
  },
  {
    id: "google",
    label: "Google",
    redesUrl: "https://www.google.com",
    redesCamUrl: "https://www.google.com",
  },
  {
    id: "mercadolibre",
    label: "Caracol TV",
    redesUrl: CARACOL_TV_URL,
    redesCamUrl: CARACOL_TV_URL,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    redesUrl: WHATSAPP_DEFAULT,
    redesCamUrl: WHATSAPP_DEFAULT,
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

    if (def.id === "whatsapp") {
      return {
        ...def,
        redesUrl: normalizeHomeWhatsAppUrl(redesUrl),
        redesCamUrl: normalizeHomeWhatsAppUrl(redesCamUrl),
      };
    }

    if (def.id === "onnivers") {
      return {
        ...def,
        redesUrl: normalizeOnniversHomeUrl(redesUrl),
        redesCamUrl: normalizeOnniversHomeUrl(redesCamUrl),
      };
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
        redesUrl: normalizeYouTubeStereoUrl(redesUrl),
        redesCamUrl: normalizeYouTubeStereoUrl(redesCamUrl),
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
