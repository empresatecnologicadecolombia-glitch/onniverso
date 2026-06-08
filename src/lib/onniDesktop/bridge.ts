import { isElectronDesktopApp } from "@/lib/deviceDetection";
import type { OnniDesktopJob, OnniDesktopResult } from "@/lib/onniDesktop/types";

export function isOnniDesktopOfficeAvailable(): boolean {
  return (
    isElectronDesktopApp() &&
    typeof window.onniversDesktop?.docenteOffice?.execute === "function"
  );
}

export async function getOnniClasesBasePath(): Promise<string | null> {
  if (!isOnniDesktopOfficeAvailable()) return null;
  return window.onniversDesktop!.docenteOffice!.getBasePath!();
}

export async function executeOnniDesktopJob(job: OnniDesktopJob): Promise<OnniDesktopResult> {
  if (!isOnniDesktopOfficeAvailable()) {
    return { ok: false, mensaje: "La oficina docente solo está disponible en OnniVers.exe" };
  }
  const result = await window.onniversDesktop!.docenteOffice!.execute!(job);
  return (result as OnniDesktopResult) ?? { ok: false, mensaje: "Sin respuesta del sistema" };
}
