import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Radio, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fetchActiveVirtualClasses, type ActiveVirtualClassRow } from "@/lib/activeVirtualClasses";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { buildStudentClassUrl } from "@/lib/studentClassLink";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function formatStartedAt(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function ActiveVirtualClassesPanel() {
  const [classes, setClasses] = useState<ActiveVirtualClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const loadClasses = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    setSignedIn(Boolean(user));

    if (!user) {
      setClasses([]);
      if (!options?.silent) setLoading(false);
      return;
    }

    try {
      const rows = await fetchActiveVirtualClasses();
      setClasses(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar las clases.";
      setError(message);
      setClasses([]);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    const channel = supabase
      .channel("active-virtual-classes-panel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aulas_virtuales" },
        () => void loadClasses({ silent: true }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clase_sesiones" },
        () => void loadClasses({ silent: true }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadClasses]);

  const copyClassLink = async (slug: string) => {
    const url = buildStudentClassUrl(slug);
    const copied = await copyToClipboard(url);
    if (copied) toast.success("Link de clase copiado.");
    else toast.error("No se pudo copiar el link.");
  };

  return (
    <article className="mt-6 overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-card/50 to-cyan-500/10 p-5 backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-100">
            <Radio className="h-3.5 w-3.5" aria-hidden />
            Clases disponibles
          </p>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Entra con el link del docente
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Cuando el docente crea una clase en el panel, aparece aquí. El estado{" "}
            <span className="text-emerald-300">Onni line</span> /{" "}
            <span className="text-slate-300">Off line</span> indica si la sesión está en vivo.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="touch-manipulation"
          onClick={() => void loadClasses()}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Actualizar
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {signedIn === false ? (
          <div className="rounded-xl border border-white/10 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
            Inicia sesión para ver las clases activas y copiar el enlace de alumno.
            <div className="mt-3">
              <Button asChild size="sm" variant="outline">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {signedIn && loading ? (
          <p className="text-sm text-muted-foreground">Cargando clases…</p>
        ) : null}

        {signedIn && error ? (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        {signedIn && !loading && !error && classes.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
            Aún no hay clases publicadas. El docente debe crear una clase en{" "}
            <Link to="/docente-clases" className="text-cyan-300 underline-offset-2 hover:underline">
              Panel docente
            </Link>
            .
          </p>
        ) : null}

        {signedIn && !loading && !error
          ? classes.map((row) => {
              const classUrl = buildStudentClassUrl(row.slug);
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-background/45 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-foreground">{row.titulo}</h3>
                      <span
                        className={
                          row.isLive
                            ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/55 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100"
                            : "inline-flex items-center gap-1.5 rounded-full border border-slate-400/40 bg-slate-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300"
                        }
                        aria-label={row.isLive ? "Clase en línea" : "Clase fuera de línea"}
                      >
                        <span
                          className={
                            row.isLive
                              ? "h-2 w-2 animate-pulse rounded-full bg-emerald-400"
                              : "h-2 w-2 rounded-full bg-slate-400"
                          }
                          aria-hidden
                        />
                        {row.isLive ? "Onni line" : "Off line"}
                      </span>
                    </div>
                    {row.descripcion ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{row.descripcion}</p>
                    ) : null}
                    <p className="mt-2 break-all font-mono text-xs text-cyan-200/90">{classUrl}</p>
                    {row.isLive && row.startedAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Iniciada: {formatStartedAt(row.startedAt)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="touch-manipulation"
                      onClick={() => void copyClassLink(row.slug)}
                    >
                      <Copy className="mr-2 h-4 w-4" aria-hidden />
                      Copiar link
                    </Button>
                    <Button asChild size="sm" className="touch-manipulation">
                      <Link to={`/clase/${encodeURIComponent(row.slug)}`}>
                        <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                        Entrar
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          : null}
      </div>
    </article>
  );
}
