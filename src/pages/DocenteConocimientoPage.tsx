import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, KeyRound, Layers, Upload } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DocenteCloudinaryConfigPanel from "@/components/docente/DocenteCloudinaryConfigPanel";
import DocenteConocimientoUploadPanel from "@/components/docente/DocenteConocimientoUploadPanel";
import DocenteConocimientoRecursosList from "@/components/docente/DocenteConocimientoRecursosList";
import {
  countDocenteVideos,
  fetchDocenteConocimientoRecursos,
  type DocenteConocimientoRecurso,
} from "@/lib/docenteConocimientoResources";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ConocimientoTabId = "subir" | "recursos" | "tarjetas" | "api";

export default function DocenteConocimientoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [tab, setTab] = useState<ConocimientoTabId>("subir");
  const [userId, setUserId] = useState<string | null>(null);
  const [videoCount, setVideoCount] = useState(0);
  const [recursos, setRecursos] = useState<DocenteConocimientoRecurso[]>([]);
  const [recursosLoading, setRecursosLoading] = useState(false);

  const canManage = useMemo(() => role === "docente" || role === "admin", [role]);

  const refreshRecursos = useCallback(async (docenteId: string) => {
    setRecursosLoading(true);
    try {
      const [rows, videos] = await Promise.all([
        fetchDocenteConocimientoRecursos(docenteId),
        countDocenteVideos(docenteId),
      ]);
      setRecursos(rows);
      setVideoCount(videos);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar tus recursos.");
    } finally {
      setRecursosLoading(false);
    }
  }, []);

  const handleUploaded = useCallback(() => {
    if (userId) void refreshRecursos(userId);
    setTab("recursos");
  }, [refreshRecursos, userId]);

  const handleBackToPanel = useCallback(() => {
    navigate("/docente-clases");
  }, [navigate]);

  useEffect(() => {
    const loadRole = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        setRole(null);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("app_role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        toast.error("No se pudo leer el rol del usuario.");
        setLoading(false);
        return;
      }

      setRole((profile as { app_role?: string } | null)?.app_role ?? "particular");
      setLoading(false);

      const currentRole = (profile as { app_role?: string } | null)?.app_role ?? "particular";
      if (currentRole === "docente" || currentRole === "admin") {
        void refreshRecursos(user.id);
      }
    };

    void loadRole();
  }, [refreshRecursos]);

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background">
      <Navbar />
      <main className="relative z-20 px-4 pb-20 pt-20 md:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold md:text-3xl">
                <span className="text-gradient-neon">Conocimiento</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sube videos, PDF y modelos 3D a Cloudinary y crea tarjetas para tu tabla de contenido y
                Videos educativos.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="heroOutline"
                size="sm"
                className="gap-1.5"
                onClick={() => setTab("api")}
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden />
                API Cloudinary
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleBackToPanel}>
                Volver al panel
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : !canManage ? (
            <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              Tu cuenta no tiene rol docente. Cuando te aprueben, podrás gestionar tu biblioteca de
              conocimiento aquí.
            </div>
          ) : (
            <section className="rounded-2xl border border-cyan-400/25 bg-card/45 p-4 backdrop-blur md:p-5">
              <Tabs value={tab} onValueChange={(value) => setTab(value as ConocimientoTabId)}>
                <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 bg-background/60 p-1 sm:grid-cols-4">
                  <TabsTrigger value="subir" className="gap-1.5 text-xs sm:text-sm">
                    <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Subir
                  </TabsTrigger>
                  <TabsTrigger value="recursos" className="gap-1.5 text-xs sm:text-sm">
                    <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Mis recursos
                  </TabsTrigger>
                  <TabsTrigger value="tarjetas" className="gap-1.5 text-xs sm:text-sm">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Crear tarjeta
                  </TabsTrigger>
                  <TabsTrigger value="api" className="gap-1.5 text-xs sm:text-sm">
                    <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    API Cloudinary
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="subir" className="mt-0 space-y-4">
                  {userId ? (
                    <DocenteConocimientoUploadPanel
                      docenteId={userId}
                      videoCount={videoCount}
                      onUploaded={handleUploaded}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="recursos" className="mt-0">
                  {recursosLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando recursos…</p>
                  ) : userId ? (
                    <DocenteConocimientoRecursosList
                      docenteId={userId}
                      recursos={recursos}
                      onChanged={() => void refreshRecursos(userId)}
                    />
                  ) : null}
                </TabsContent>

                <TabsContent value="tarjetas" className="mt-0">
                  <p className="rounded-xl border border-border/50 bg-black/20 p-6 text-center text-sm text-muted-foreground">
                    Crea tarjetas con título, descripción e imagen para publicar en tu tabla de contenido
                    y en Videos educativos.
                  </p>
                </TabsContent>

                <TabsContent value="api" className="mt-0">
                  <DocenteCloudinaryConfigPanel />
                </TabsContent>
              </Tabs>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
