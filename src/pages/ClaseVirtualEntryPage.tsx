import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { invokeOpenColiceoDirect } from "@/lib/coliseoOpenDirect";
import { COLOSSEO_PATH } from "@/data/coliseoScene";
import { stashColiseoClassLaunch } from "@/lib/coliseoClassLaunch";
import { COLISEO_CLASS_ENTRY_POLL } from "@/lib/coliseoClassVoiceBaseline";
import { onniMicDeniedMessage, requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";

type Aula = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  docente_id: string;
  is_active: boolean;
};

type Template = {
  mp4_url: string | null;
  pdf_url: string | null;
  glb_url: string | null;
  titulo: string;
  metadata?: { video_urls?: unknown } | null;
};

type Member = {
  id: string;
  estado: "approved" | "pending" | "blocked";
  rol: string;
};

type SessionSnapshot = {
  mp4_url: string | null;
  pdf_url: string | null;
  glb_url: string | null;
  glb_v?: string | null;
  metadata?: { video_urls?: unknown } | null;
};

const LIVE_SESSION_POLL_MS = COLISEO_CLASS_ENTRY_POLL.liveSessionMs;
const AULA_RETRY_POLL_MS = COLISEO_CLASS_ENTRY_POLL.aulaRetryMs;
const AUTH_SESSION_WAIT_MS = COLISEO_CLASS_ENTRY_POLL.authSessionWaitMs;
const AUTH_SESSION_POLL_MS = COLISEO_CLASS_ENTRY_POLL.authSessionPollMs;
const AULA_LOOKUP_FAIL_THRESHOLD = COLISEO_CLASS_ENTRY_POLL.aulaLookupFailThreshold;

async function waitForAuthUser(fallbackUser: User | null): Promise<User | null> {
  if (fallbackUser?.id) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user;
  }

  const deadline = Date.now() + AUTH_SESSION_WAIT_MS;
  while (Date.now() < deadline) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user;
    await new Promise((resolve) => window.setTimeout(resolve, AUTH_SESSION_POLL_MS));
  }

  return fallbackUser?.id ? fallbackUser : null;
}

function normalizeVideoUrls(primaryMp4: string, rawList: unknown): string[] {
  const list = Array.isArray(rawList) ? rawList : [];
  const fromList = list
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
  const fromPrimary = primaryMp4.trim();
  // Si existe playlist de videos, no mezclar mp4 legacy.
  const merged = fromList.length > 0 ? fromList : fromPrimary ? [fromPrimary] : [];
  return Array.from(new Set(merged));
}

export default function ClaseVirtualEntryPage() {
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [aula, setAula] = useState<Aula | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [role, setRole] = useState<string>("particular");
  const [isClassLive, setIsClassLive] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string>("");
  const [liveSnapshot, setLiveSnapshot] = useState<SessionSnapshot | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const realtimeReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadGenerationRef = useRef(0);
  const aulaLookupAttemptsRef = useRef(0);
  const aulaRef = useRef<Aula | null>(null);
  aulaRef.current = aula;

  const hasAccess = useMemo(() => {
    if (!aula) return false;
    if (role === "admin") return true;
    if (member?.estado === "approved") return true;
    return false;
  }, [aula, member?.estado, role]);

  const canEnter = useMemo(() => hasAccess && isClassLive, [hasAccess, isClassLive]);

  const classUrl = useMemo(() => {
    // En clase en vivo usamos snapshot activo; fuera de vivo tomamos template.
    const source = isClassLive ? (liveSnapshot ?? template) : template;
    const activeMp4 = source?.mp4_url?.trim() || "";
    const videoUrls = normalizeVideoUrls(activeMp4, source?.metadata?.video_urls ?? null);
    const activePdf = source?.pdf_url?.trim() || "";
    const activeGlb = source?.glb_url?.trim() || "";
    const activeGlbVersion =
      typeof (source as { glb_v?: unknown } | null)?.glb_v === "string" &&
      (source as { glb_v?: string | null }).glb_v?.trim()
        ? (source as { glb_v?: string | null }).glb_v!.trim()
        : activeGlb
          ? `${Date.now()}`
          : "";
    const params = new URLSearchParams();
    if (aula?.slug) params.set("class", aula.slug);
    if (liveSessionId) params.set("session", liveSessionId);
    if (videoUrls.length === 0 && activeMp4) params.set("mp4", activeMp4);
    for (const videoUrl of videoUrls) params.append("video", videoUrl);
    if (activePdf) params.set("pdf", activePdf);
    if (activeGlb) params.set("glb", activeGlb);
    if (activeGlbVersion) params.set("glb_v", activeGlbVersion);
    const q = params.toString();
    return q ? `${COLOSSEO_PATH}?${q}` : COLOSSEO_PATH;
  }, [
    aula?.slug,
    isClassLive,
    liveSessionId,
    liveSnapshot?.metadata?.video_urls,
    liveSnapshot?.glb_url,
    liveSnapshot?.mp4_url,
    liveSnapshot?.pdf_url,
    template?.metadata?.video_urls,
    template?.glb_url,
    template?.mp4_url,
    template?.pdf_url,
  ]);

  const applyLiveSession = useCallback((liveSession: { id?: string; state_snapshot?: unknown } | null) => {
    setIsClassLive(Boolean(liveSession));
    setLiveSessionId(liveSession?.id ?? "");
    const snapshot = liveSession?.state_snapshot as SessionSnapshot | null | undefined;
    setLiveSnapshot(snapshot ?? null);
  }, []);

  const refreshLiveSession = useCallback(
    async (aulaId: string) => {
      const { data: liveSession } = await supabase
        .from("clase_sesiones" as any)
        .select("id,status,started_at,state_snapshot")
        .eq("aula_id", aulaId)
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      applyLiveSession((liveSession as { id?: string; state_snapshot?: unknown } | null) ?? null);
    },
    [applyLiveSession],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const slugTrimmed = slug.trim();
      if (!slugTrimmed) {
        setAula(null);
        setLookupFailed(true);
        setLoading(false);
        return;
      }

      const generation = ++loadGenerationRef.current;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);

      try {
        const user = await waitForAuthUser(authUser);
        if (generation !== loadGenerationRef.current) return;

        if (!user) {
          setCurrentUserId("");
          aulaLookupAttemptsRef.current += 1;
          setLookupFailed(aulaLookupAttemptsRef.current >= AULA_LOOKUP_FAIL_THRESHOLD);
          return;
        }
        setCurrentUserId(user.id);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("app_role")
          .eq("id", user.id)
          .maybeSingle();
        if (generation !== loadGenerationRef.current) return;

        const currentRole = ((profileData as { app_role?: string } | null)?.app_role ?? "particular") as string;
        setRole(currentRole);

        const { data: aulaData, error: aulaError } = await supabase
          .from("aulas_virtuales" as any)
          .select("id,slug,nombre,descripcion,docente_id,is_active")
          .eq("slug", slugTrimmed)
          .maybeSingle();
        if (generation !== loadGenerationRef.current) return;

        if (aulaError || !aulaData) {
          aulaLookupAttemptsRef.current += 1;
          setAula(null);
          setTemplate(null);
          setMember(null);
          setLookupFailed(aulaLookupAttemptsRef.current >= AULA_LOOKUP_FAIL_THRESHOLD);
          return;
        }

        aulaLookupAttemptsRef.current = 0;
        setLookupFailed(false);
        setAula(aulaData as Aula);

        const { data: tpl } = await supabase
          .from("clase_templates" as any)
          .select("titulo,mp4_url,pdf_url,glb_url,metadata")
          .eq("aula_id", aulaData.id)
          .maybeSingle();
        if (generation !== loadGenerationRef.current) return;
        setTemplate((tpl as Template | null) ?? null);

        const isOwner = aulaData.docente_id === user.id;
        let currentMember: Member | null = null;
        if (isOwner) {
          setMember({ id: "owner", estado: "approved", rol: "teacher" });
        } else {
          const { data: memberData } = await supabase
            .from("aula_miembros" as any)
            .select("id,estado,rol")
            .eq("aula_id", aulaData.id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (generation !== loadGenerationRef.current) return;
          currentMember = (memberData as Member | null) ?? null;
          setMember(currentMember);
        }

        const canReadSessionState =
          currentRole === "admin" || isOwner || currentMember?.estado === "approved";
        if (canReadSessionState) {
          await refreshLiveSession(aulaData.id);
        }
      } finally {
        if (generation === loadGenerationRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [authUser, slug, refreshLiveSession],
  );

  useEffect(() => {
    aulaLookupAttemptsRef.current = 0;
    setLookupFailed(false);
    void load();
  }, [load]);

  const queueRealtimeReload = useCallback(() => {
    if (realtimeReloadTimeoutRef.current) return;
    realtimeReloadTimeoutRef.current = setTimeout(() => {
      realtimeReloadTimeoutRef.current = null;
      const aulaId = aulaRef.current?.id;
      if (aulaId) void refreshLiveSession(aulaId);
      else void load();
    }, 250);
  }, [load, refreshLiveSession]);

  useEffect(
    () => () => {
      if (realtimeReloadTimeoutRef.current) clearTimeout(realtimeReloadTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!aula?.id || !currentUserId) return;
    const channel = supabase
      .channel(`classroom-entry-${aula.id}-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clase_sesiones", filter: `aula_id=eq.${aula.id}` },
        queueRealtimeReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aula_miembros", filter: `aula_id=eq.${aula.id}` },
        queueRealtimeReload,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [aula?.id, currentUserId, queueRealtimeReload]);

  useEffect(() => {
    if (!aula?.id || !hasAccess) return;
    void refreshLiveSession(aula.id);
  }, [aula?.id, hasAccess, refreshLiveSession]);

  useEffect(() => {
    if (!aula?.id || !hasAccess || isClassLive || loading) return;
    const timer = window.setInterval(() => {
      void refreshLiveSession(aula.id);
    }, LIVE_SESSION_POLL_MS);
    return () => window.clearInterval(timer);
  }, [aula?.id, hasAccess, isClassLive, loading, refreshLiveSession]);

  useEffect(() => {
    if (loading || aula || !slug.trim() || lookupFailed) return;
    const timer = window.setInterval(() => {
      void load({ silent: true });
    }, AULA_RETRY_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loading, aula, slug, lookupFailed, load]);

  const requestAccess = async () => {
    if (!aula || requesting) return;
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;
    setRequesting(true);
    const { error } = await supabase.from("aula_miembros" as any).insert({
      aula_id: aula.id,
      user_id: user.id,
      rol: "student",
      estado: "pending",
    });
    if (error) toast.error(error.message);
    else toast.success("Solicitud enviada al docente.");
    setRequesting(false);
    await load();
  };

  const enterClassroom = async () => {
    if (!canEnter) return;
    const isDocente = Boolean(aula && currentUserId && aula.docente_id === currentUserId);
    if (!isDocente) {
      const micPermission = await requestOnniMicrophoneAccess();
      if (micPermission !== "granted") {
        toast.error(onniMicDeniedMessage());
      }
    }
    // Candado: coliseo-class-voice-frozen — APK nativo primero, luego navigate web.
    stashColiseoClassLaunch(classUrl);
    if (invokeOpenColiceoDirect(classUrl)) return;
    navigate(classUrl);
  };

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background">
      <Navbar />
      <main className="relative z-20 px-4 pb-20 pt-20 md:px-6">
        <div className="container mx-auto max-w-2xl rounded-2xl border border-cyan-400/25 bg-card/45 p-5 backdrop-blur-xl">
          {loading || (!aula && !lookupFailed) ? (
            <p className="text-sm text-muted-foreground">Cargando clase…</p>
          ) : !aula ? (
            <p className="text-sm text-rose-200">Esta clase no existe o no está activa.</p>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">
                {template?.titulo?.trim() || aula.nombre}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {aula.descripcion?.trim() || "Clase virtual 360 con recursos compartidos por el docente."}
              </p>
              <p className="mt-2 text-xs text-cyan-100/90">
                Estado: {isClassLive ? "Clase en vivo" : "Esperando que el docente inicie la clase"}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {canEnter ? (
                  <Button onClick={enterClassroom}>Entrar a clase 360</Button>
                ) : hasAccess ? (
                  <Button disabled>Aun no inicia la clase</Button>
                ) : member?.estado === "pending" ? (
                  <Button disabled>Solicitud enviada (pendiente)</Button>
                ) : member?.estado === "blocked" ? (
                  <Button disabled>Acceso bloqueado</Button>
                ) : (
                  <Button onClick={() => void requestAccess()} disabled={requesting}>
                    Solicitar acceso
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link to="/3d">Volver</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
