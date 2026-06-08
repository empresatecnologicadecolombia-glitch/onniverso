import { executeOnniDesktopJob, isOnniDesktopOfficeAvailable } from "@/lib/onniDesktop/bridge";
import { desktopJobSummary } from "@/lib/onniDesktop/intents";
import type { OnniDesktopJob, OnniDesktopResult } from "@/lib/onniDesktop/types";

const ELECTRON_AFTER: Record<string, string> = {
  crear_carpeta_clase: "abrir_carpeta",
  organizar_archivos: "abrir_carpeta",
  ejecutar_flujo_preparar_clase: "abrir_ventana_preview",
};

export async function runOnniDesktopJob(job: OnniDesktopJob): Promise<OnniDesktopResult> {
  if (!isOnniDesktopOfficeAvailable()) {
    return { ok: false, mensaje: "Disponible solo en OnniVers.exe" };
  }

  const main = await executeOnniDesktopJob(job);
  if (!main.ok) return main;

  const followAction =
    job.tipo === "flujo"
      ? ELECTRON_AFTER[job.flujo]
      : job.tipo === "accion"
        ? ELECTRON_AFTER[job.accion]
        : job.tipo === "secuencia" && job.pasos.some((p) => p.accion === "crear_carpeta_clase")
          ? "abrir_ventana_preview"
          : undefined;

  if (followAction && main.carpeta) {
    await executeOnniDesktopJob({
      v: 1,
      tipo: "accion",
      accion: followAction,
      params: { carpeta: main.carpeta },
    });
  }

  await executeOnniDesktopJob({
    v: 1,
    tipo: "accion",
    accion: "mostrar_notificacion",
    params: {
      titulo: "OnniVers — Oficina docente",
      mensaje: main.mensaje || desktopJobSummary(job),
    },
  });

  return main;
}
