import { supabase } from "@/integrations/supabase/client";

export type ActiveVirtualClassRow = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  titulo: string;
  isLive: boolean;
  startedAt: string | null;
};

type LiveSessionRow = {
  aula_id: string;
  started_at: string;
  state_snapshot?: { titulo?: string | null } | null;
};

type AulaRow = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  created_at: string;
};

export async function fetchActiveVirtualClasses(): Promise<ActiveVirtualClassRow[]> {
  const { data: aulas, error: aulasError } = await supabase
    .from("aulas_virtuales" as any)
    .select("id,slug,nombre,descripcion,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (aulasError) {
    throw new Error(aulasError.message);
  }

  const aulaRows = (aulas ?? []) as AulaRow[];
  if (aulaRows.length === 0) return [];

  const aulaIds = aulaRows.map((row) => row.id);
  const { data: liveSessions, error: sessionsError } = await supabase
    .from("clase_sesiones" as any)
    .select("aula_id,started_at,state_snapshot")
    .eq("status", "live")
    .in("aula_id", aulaIds);

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const liveByAula = new Map<string, LiveSessionRow>();
  for (const row of (liveSessions ?? []) as LiveSessionRow[]) {
    if (!liveByAula.has(row.aula_id)) {
      liveByAula.set(row.aula_id, row);
    }
  }

  return aulaRows
    .map((aula) => {
      const live = liveByAula.get(aula.id);
      const liveTitle = live?.state_snapshot?.titulo?.trim();
      return {
        id: aula.id,
        slug: aula.slug,
        nombre: aula.nombre,
        descripcion: aula.descripcion,
        titulo: liveTitle || aula.nombre,
        isLive: Boolean(live),
        startedAt: live?.started_at ?? null,
      };
    })
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return 0;
    });
}
