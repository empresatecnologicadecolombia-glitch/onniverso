import type { OnniDesktopJob } from "@/lib/onniDesktop/types";

function extractTema(text: string): string {
  const patterns = [
    /(?:clase|tema|sobre|de)\s+(?:la\s+|el\s+|los\s+|las\s+)?(.+)$/i,
    /prep[aá]r(?:a|ame|ar)\s+(?:la\s+)?(?:clase\s+)?(?:de\s+)?(.+)$/i,
    /(?:busca|buscar)\s+(?:un\s+)?(?:pdf\s+)?(?:de\s+|sobre\s+)?(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim().replace(/[?.!]+$/, "");
  }
  return "";
}

export function matchOnniDesktopIntent(text: string): OnniDesktopJob | null {
  const t = text.trim().toLowerCase();
  const tema = extractTema(text);

  if (
    /\b(prepar[aá]|prep[aá]rame|preparar)\s+(?:la\s+)?(?:clase|material|todo)\b/.test(t) ||
    /\bpreparar\s+clase\b/.test(t)
  ) {
    return {
      v: 1,
      tipo: "flujo",
      flujo: "ejecutar_flujo_preparar_clase",
      params: { tema: tema || "clase", grado: "", max_video_mb: 30 },
      confirmar: true,
    };
  }

  if (/\b(genera|crea|haz)\s+(?:un\s+)?examen\b/.test(t) || /\bflujo\s+examen\b/.test(t)) {
    return {
      v: 1,
      tipo: "flujo",
      flujo: "ejecutar_flujo_examen",
      params: { tema: tema || "evaluación" },
      confirmar: true,
    };
  }

  if (/\b(ordena|organiza)\s+(?:la\s+)?(?:carpeta|archivos|descargas)\b/.test(t)) {
    return { v: 1, tipo: "accion", accion: "organizar_archivos", params: {} };
  }

  if (/\b(crea|crear)\s+carpeta\b/.test(t) || /\bnueva\s+carpeta\s+de\s+clase\b/.test(t)) {
    return {
      v: 1,
      tipo: "accion",
      accion: "crear_carpeta_clase",
      params: { tema: tema || "clase" },
    };
  }

  if (/\b(abre|abrir)\s+(?:la\s+)?carpeta\b/.test(t)) {
    return { v: 1, tipo: "accion", accion: "abrir_carpeta", params: {} };
  }

  if (/\b(revisa|previsualiza|preview)\s+(?:la\s+)?clase\b/.test(t)) {
    return { v: 1, tipo: "accion", accion: "abrir_ventana_preview", params: {} };
  }

  if (/\b(crea|crear)\s+(?:un\s+)?pdf\b/.test(t)) {
    return {
      v: 1,
      tipo: "accion",
      accion: "crear_pdf",
      params: { titulo: tema || "Documento", contenido: tema ? `Material sobre ${tema}` : "" },
    };
  }

  if (/\b(crea|crear)\s+(?:un\s+)?power\s*point\b/.test(t) || /\b(crea|crear)\s+ppt\b/.test(t)) {
    return {
      v: 1,
      tipo: "accion",
      accion: "crear_ppt",
      params: { titulo: tema || "Clase", tema: tema || "Clase" },
    };
  }

  if (/\bbusca\b.*\bpdf\b/.test(t) && /\bresumen\b/.test(t)) {
    return {
      v: 1,
      tipo: "secuencia",
      pasos: [
        { accion: "buscar_pdf_en_internet", params: { tema: tema || "tema" } },
        { accion: "buscar_informacion", params: { tema: tema || "tema" } },
        { accion: "generar_resumen", params: { texto: "{{paso1.resumen}}" } },
        { accion: "crear_pdf", params: { titulo: `Resumen ${tema || "clase"}`, contenido: "{{paso2.resumen}}" } },
      ],
      confirmar: true,
    };
  }

  if (/\bbusca\b/.test(t) && (tema || /\bsobre\b/.test(t))) {
    return { v: 1, tipo: "accion", accion: "buscar_informacion", params: { tema: tema || text } };
  }

  if (/\b(descarga|baja)\s+.*\bvideo\b/.test(t) || /\byoutube\b/.test(t)) {
    const urlMatch = text.match(/https?:\/\/\S+/i);
    return {
      v: 1,
      tipo: "secuencia",
      pasos: [
        { accion: "crear_carpeta_clase", params: { tema: tema || "video" } },
        { accion: "descargar_video", params: { url: urlMatch?.[0] ?? "", tema: tema || "video" } },
        { accion: "optimizar_video", params: { max_mb: 30 } },
      ],
      confirmar: !urlMatch,
    };
  }

  return null;
}

export function desktopJobSummary(job: OnniDesktopJob): string {
  if (job.tipo === "flujo") {
    return `Flujo ${job.flujo}${job.params?.tema ? ` (${String(job.params.tema)})` : ""}`;
  }
  if (job.tipo === "secuencia") {
    return `Secuencia de ${job.pasos.length} pasos`;
  }
  return `Acción ${job.accion}`;
}
