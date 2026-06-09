import type { OnniDesktopJob } from "@/lib/onniDesktop/types";

function normalizeForMatch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function cleanTema(raw: string): string {
  let tema = raw.trim().replace(/[?.!]+$/, "");
  tema = tema.replace(/\s+y\s+(?:me\s+)?(?:crea|crear|creame|haz|hacer|genera|generar).*$/i, "").trim();
  tema = tema.replace(/\s+(?:en|como)\s+(?:un\s+)?pdf.*$/i, "").trim();
  return tema;
}

function extractTema(text: string): string {
  const patterns = [
    /prep[aá]r(?:a|ame|ar)\s+(?:una\s+|la\s+|el\s+)?(?:clase\s+)?(?:de\s+|sobre\s+)(.+)$/i,
    /(?:clase|tema|material)\s+(?:de\s+|sobre\s+)(?:la\s+|el\s+|los\s+|las\s+)?(.+)$/i,
    /(?:busca|buscar|investiga|investigar)\s+(?:un\s+)?(?:pdf\s+)?(?:de\s+|sobre\s+)?(.+)$/i,
    /(?:sobre|de)\s+(?:la\s+|el\s+|los\s+|las\s+)?(.+)$/i,
    /prep[aá]r(?:a|ame|ar)\s+(?:una\s+|la\s+)?(?:clase\s+)?(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      const tema = cleanTema(match[1]);
      if (tema.length > 2 && !/^(clase|material|una|un|pdf)$/i.test(tema)) return tema;
    }
  }
  return "";
}

function wantsPrepareClass(t: string): boolean {
  return (
    (/\bprep[aá]r(?:a|ame|ar)\b/.test(t) && /\b(clase|clases|material)\b/.test(t)) ||
    (/\bprep[aá]r(?:a|ame|ar)\b/.test(t) && /\b(sobre|de)\b/.test(t)) ||
    /\bpreparar\s+(?:una\s+|la\s+)?clase\b/.test(t)
  );
}

function wantsCreateClassFolder(t: string): boolean {
  return (
    /\bcre[aá](?:r|me)?\b.*\bcarpeta\b/.test(t) ||
    /\bcrear\s+(?:una\s+|la\s+)?carpeta\b/.test(t) ||
    /\bnueva\s+carpeta\s+(?:de\s+)?clase\b/.test(t) ||
    (/\bcarpeta\b/.test(t) &&
      /\b(cre[aá]|prep[aá]r|genera|haz|hacer)\b/.test(t) &&
      /\b(pdf|resumen|video|videos|ppt|powerpoint|documento)\b/.test(t))
  );
}

function wantsSearchAndPdf(t: string): boolean {
  const hasSearch = /\b(busca|buscar|investiga|investigar)\b/.test(t);
  const hasPdf =
    /\bpdf\b/.test(t) ||
    /\b(crea|crear|creame|haz|hacer|genera|generar)\s+(?:un\s+|el\s+|la\s+)?(?:pdf|documento)\b/.test(t);
  return hasSearch && hasPdf;
}

export function matchOnniDesktopIntent(text: string): OnniDesktopJob | null {
  const t = normalizeForMatch(text);
  const tema = extractTema(text);

  if (wantsPrepareClass(t) || wantsCreateClassFolder(t)) {
    return {
      v: 1,
      tipo: "flujo",
      flujo: "ejecutar_flujo_preparar_clase",
      params: { tema: tema || "clase", grado: "", max_video_mb: 30 },
      confirmar: true,
    };
  }

  if (/\b(genera|crea|crear|haz|hacer)\s+(?:un\s+)?examen\b/.test(t) || /\bflujo\s+examen\b/.test(t)) {
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

  if (/\b(abre|abrir)\s+(?:la\s+)?carpeta\b/.test(t)) {
    return { v: 1, tipo: "accion", accion: "abrir_carpeta", params: {} };
  }

  if (/\b(revisa|previsualiza|preview)\s+(?:la\s+)?clase\b/.test(t)) {
    return { v: 1, tipo: "accion", accion: "abrir_ventana_preview", params: {} };
  }

  if (wantsSearchAndPdf(t)) {
    return {
      v: 1,
      tipo: "flujo",
      flujo: "ejecutar_flujo_buscar_y_pdf",
      params: { tema: tema || "tema", grado: "" },
      confirmar: true,
    };
  }

  if (/\b(crea|crear|creame)\s+(?:un\s+)?pdf\b/.test(t)) {
    return {
      v: 1,
      tipo: "flujo",
      flujo: "ejecutar_flujo_buscar_y_pdf",
      params: { tema: tema || "Documento", grado: "" },
      confirmar: !tema,
    };
  }

  if (
    /\b(crea|crear|creame)\s+(?:un\s+)?power\s*point\b/.test(t) ||
    /\b(crea|crear|creame)\s+ppt\b/.test(t)
  ) {
    return {
      v: 1,
      tipo: "accion",
      accion: "crear_ppt",
      params: { titulo: tema || "Clase", tema: tema || "Clase" },
    };
  }

  if (/\bbusca\b/.test(t) && (tema || /\bsobre\b/.test(t))) {
    return {
      v: 1,
      tipo: "flujo",
      flujo: "ejecutar_flujo_buscar_y_pdf",
      params: { tema: tema || text, grado: "" },
      confirmar: true,
    };
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

export function looksLikeDesktopOfficeRequest(text: string): boolean {
  return matchOnniDesktopIntent(text) !== null;
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
