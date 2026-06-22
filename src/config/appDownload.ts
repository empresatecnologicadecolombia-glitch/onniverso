/** APK OnniVers Educación (onniversv2.0.apk) — Google Drive. */
export const APP_APK_DOWNLOAD_URL =
  "https://drive.google.com/file/d/1Lk76hYn7ObUzx8GvKoL3gjmih98eAVJ-/view?usp=drive_link";

/** OnniVers Educación — plataforma principal (aulas, ecosistema, Mi Mundo). */
export const ONNIVERS_EDUCATION_EXE_URL =
  "https://drive.google.com/file/d/1KfAonOmR6-oQz0n_6m35eGDEjBcVGkgp/view?usp=sharing";
export const ONNIVERS_EDUCATION_APK_URL = APP_APK_DOWNLOAD_URL;
/** Instalador portable o build alternativo (opcional). */
export const ONNIVERS_EDUCATION_PORTABLE_EXE_URL = "";

/** OnniVers Eventos — conciertos, live 360°, transmisiones. */
export const ONNIVERS_EVENTOS_EXE_URL = "";
export const ONNIVERS_EVENTOS_APK_URL =
  "https://drive.google.com/file/d/1V1KanPh0j3ugpMexhhzP7QSES1VMIxc5/view?usp=sharing";

/** Onni Jarvis — IA de escritorio (automatización, Telegram, App Manager). */
export const ONNI_JARVIS_EXE_URL = "";
export const ONNI_JARVIS_PORTABLE_EXE_URL = "";

export type OnniVersDownloadAsset = {
  id: string;
  label: string;
  subtitle: string;
  url: string;
  platform: "windows" | "android" | "telegram";
};

export const ONNIVERS_EDUCATION_DOWNLOADS: OnniVersDownloadAsset[] = [
  {
    id: "edu-exe",
    label: "Instalador Windows",
    subtitle: "OnniVers Educación · .exe",
    url: ONNIVERS_EDUCATION_EXE_URL,
    platform: "windows",
  },
  {
    id: "edu-apk",
    label: "Aplicación Android",
    subtitle: "OnniVers Educación · APK",
    url: ONNIVERS_EDUCATION_APK_URL,
    platform: "android",
  },
  {
    id: "edu-portable",
    label: "Portable Windows",
    subtitle: "Sin instalador · .exe",
    url: ONNIVERS_EDUCATION_PORTABLE_EXE_URL,
    platform: "windows",
  },
];

export const ONNIVERS_EVENTOS_DOWNLOADS: OnniVersDownloadAsset[] = [
  {
    id: "evt-exe",
    label: "Instalador Windows",
    subtitle: "OnniVers Eventos · .exe",
    url: ONNIVERS_EVENTOS_EXE_URL,
    platform: "windows",
  },
  {
    id: "evt-apk",
    label: "Aplicación Android",
    subtitle: "OnniVers Eventos · APK",
    url: ONNIVERS_EVENTOS_APK_URL,
    platform: "android",
  },
];

export const ONNI_JARVIS_DOWNLOADS: OnniVersDownloadAsset[] = [
  {
    id: "jarvis-exe",
    label: "Instalador Windows",
    subtitle: "Onni Jarvis · .exe",
    url: ONNI_JARVIS_EXE_URL,
    platform: "windows",
  },
  {
    id: "jarvis-portable",
    label: "Portable Windows",
    subtitle: "Onni Jarvis · sin instalador",
    url: ONNI_JARVIS_PORTABLE_EXE_URL,
    platform: "windows",
  },
];

export function openOnniVersDownload(url: string): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  window.open(trimmed, "_blank", "noopener,noreferrer");
  return true;
}
