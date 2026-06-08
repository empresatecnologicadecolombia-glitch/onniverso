import { ONNI_STORAGE_KEYS } from "@/lib/onniVoice";

const STORAGE_KEY = ONNI_STORAGE_KEYS.desktopOfficeMode;

export function readDesktopOfficeMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDesktopOfficeMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore quota */
  }
}

export function getDesktopOfficeHint(): string {
  return 'Modo oficina: "prepárame una clase sobre biología", "crea carpeta con PDF y resumen", "abre la carpeta".';
}

export function getDesktopOfficePlaceholder(): string {
  return "prepárame una clase, crea PDF, organiza carpeta…";
}
