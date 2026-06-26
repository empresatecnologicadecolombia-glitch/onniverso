import { useMemo } from "react";
import { Box, Copy, FileText, Film, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/copyToClipboard";
import {
  deleteDocenteConocimientoRecurso,
  labelForTipo,
  type DocenteConocimientoRecurso,
  type DocenteRecursoTipo,
} from "@/lib/docenteConocimientoResources";
import { toast } from "sonner";

const TIPO_ICON: Record<DocenteRecursoTipo, typeof Film> = {
  video: Film,
  pdf: FileText,
  glb: Box,
};

type DocenteConocimientoRecursosListProps = {
  docenteId: string;
  recursos: DocenteConocimientoRecurso[];
  onChanged: () => void;
};

export default function DocenteConocimientoRecursosList({
  docenteId,
  recursos,
  onChanged,
}: DocenteConocimientoRecursosListProps) {
  const grouped = useMemo(() => {
    const map: Record<DocenteRecursoTipo, DocenteConocimientoRecurso[]> = {
      video: [],
      pdf: [],
      glb: [],
    };
    for (const item of recursos) {
      map[item.tipo].push(item);
    }
    return map;
  }, [recursos]);

  const handleCopy = async (url: string, tipo: DocenteRecursoTipo) => {
    const copied = await copyToClipboard(url);
    if (!copied) {
      toast.error("No se pudo copiar el enlace.");
      return;
    }
    const hint =
      tipo === "video"
        ? "Pégalo en el campo de video de tu clase."
        : tipo === "pdf"
          ? "Pégalo en el campo PDF de tu clase."
          : "Pégalo en el campo GLB de tu clase.";
    toast.success(`Enlace copiado. ${hint}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocenteConocimientoRecurso(id, docenteId);
      toast.success("Recurso eliminado.");
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  };

  if (recursos.length === 0) {
    return (
      <p className="rounded-xl border border-border/50 bg-black/20 p-6 text-center text-sm text-muted-foreground">
        Aún no has subido archivos. Ve a la pestaña <strong className="text-cyan-100">Subir</strong>.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {(["video", "pdf", "glb"] as DocenteRecursoTipo[]).map((tipo) => {
        const items = grouped[tipo];
        if (items.length === 0) return null;
        const Icon = TIPO_ICON[tipo];
        return (
          <section key={tipo} className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-cyan-50">
              <Icon className="h-4 w-4 text-cyan-300" aria-hidden />
              {labelForTipo(tipo)} ({items.length})
            </h3>
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-cyan-400/20 bg-black/25 p-3 backdrop-blur-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.titulo}</p>
                      {item.file_name ? (
                        <p className="truncate text-xs text-muted-foreground">{item.file_name}</p>
                      ) : null}
                      <p className="mt-2 break-all rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 font-mono text-[11px] text-cyan-100/90">
                        {item.resource_url}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-cyan-400/40 text-cyan-100"
                        onClick={() => void handleCopy(item.resource_url, item.tipo)}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                        Copiar enlace
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="border-red-400/30 text-red-200 hover:bg-red-500/10"
                        aria-label="Eliminar recurso"
                        onClick={() => void handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
