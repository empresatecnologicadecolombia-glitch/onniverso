import ColiseoImmersiveScene from "@/components/immersive/ColiseoImmersiveScene";
import AgoraClassVoiceBridge from "@/components/streaming/AgoraClassVoiceBridge";
import {
  attachCameraStreamToVideo,
  isCameraStreamLive,
  openCameraStream,
} from "@/lib/cameraMedia";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { ColiseoStudentCameraSyncProvider } from "@/contexts/ColiseoStudentCameraSyncContext";
import { useColiseoStudentCameraSync } from "@/hooks/useColiseoStudentCameraSync";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { consumeColiseoClassLaunch } from "@/lib/coliseoClassLaunch";
import { supabase } from "@/integrations/supabase/client";

const ColiseoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [voiceRole, setVoiceRole] = useState<"host" | "audience" | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraBackgroundRef = useRef<HTMLVideoElement | null>(null);

  const classSlug = useMemo(
    () => new URLSearchParams(location.search).get("class")?.trim() ?? "",
    [location.search],
  );

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    setCameraReady(false);
    setCameraEnabled(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (cameraBusy || cameraEnabled) return;

    setCameraBusy(true);
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await openCameraStream();
      const video = cameraBackgroundRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("No se pudo preparar la vista de camara.");
      }

      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraEnabled(true);
      await attachCameraStreamToVideo(video, stream);
      setCameraReady(isCameraStreamLive(stream));
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "No se pudo activar la camara.");
      stopCamera();
    } finally {
      setCameraBusy(false);
    }
  }, [cameraBusy, cameraEnabled, stopCamera]);

  const toggleCamera = useCallback(async () => {
    if (cameraBusy) return;
    if (cameraEnabled) {
      stopCamera();
      return;
    }
    await startCamera();
  }, [cameraBusy, cameraEnabled, startCamera, stopCamera]);

  const studentCameraSync = useColiseoStudentCameraSync({
    classSlug,
    role: voiceRole,
    cameraEnabled,
    cameraBusy,
    startCamera,
    stopCamera,
  });

  const teacherCameraSyncUi =
    voiceRole === "host" && classSlug
      ? {
          studentsCamerasOn: studentCameraSync.studentsCamerasOn,
          studentsCamerasBusy: studentCameraSync.studentsCamerasBusy,
          toggleStudentCameras: studentCameraSync.toggleStudentCameras,
        }
      : null;

  useEffect(() => () => stopCamera(), [stopCamera]);

  const backTarget = useMemo(() => {
    if (voiceRole === "host") return "/docente-clases";
    if (classSlug) return `/clase/${classSlug}`;
    return null;
  }, [classSlug, voiceRole]);

  useEffect(() => {
    let cancelled = false;
    // Reintentos: en celular (APK) el primer getUser/consulta puede fallar por
    // refresh de token o red móvil lenta; sin retry el puente de voz nunca montaba.
    const RETRY_DELAYS_MS = [0, 900, 1800, 3200];

    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const tryResolveOnce = async (): Promise<"host" | "audience" | null | "retry"> => {
      let user: { id: string } | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        user = authData.user;
      } catch {
        return "retry";
      }
      if (!user) return "retry";

      try {
        const { data: aulaRow, error } = await supabase
          .from("aulas_virtuales" as any)
          .select("docente_id")
          .eq("slug", classSlug)
          .maybeSingle();
        if (error) return "retry";
        const docenteId = (aulaRow as { docente_id?: string } | null)?.docente_id ?? "";
        if (!docenteId) return null;
        return docenteId === user.id ? "host" : "audience";
      } catch {
        return "retry";
      }
    };

    const resolveVoiceRole = async () => {
      if (!classSlug) {
        setVoiceRole(null);
        return;
      }

      for (const delay of RETRY_DELAYS_MS) {
        if (delay > 0) await sleep(delay);
        if (cancelled) return;
        const result = await tryResolveOnce();
        if (cancelled) return;
        if (result !== "retry") {
          setVoiceRole(result);
          return;
        }
      }
      if (!cancelled) setVoiceRole(null);
    };

    void resolveVoiceRole();
    return () => {
      cancelled = true;
    };
  }, [classSlug]);

  useEffect(() => {
    if (location.search) return;
    const pending = consumeColiseoClassLaunch();
    if (!pending) return;
    try {
      const resolved = new URL(pending, window.location.origin);
      if (resolved.pathname !== "/coliseo") return;
      if (!resolved.search) return;
      navigate(`${resolved.pathname}${resolved.search}${resolved.hash}`, { replace: true });
    } catch {
      // Ignora handoff inválido; Coliseo sigue en modo normal.
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const el = cameraBackgroundRef.current;
    if (!el || !cameraStream) {
      setCameraReady(false);
      return;
    }

    let cancelled = false;
    setCameraReady(false);

    void attachCameraStreamToVideo(el, cameraStream)
      .then(() => {
        if (!cancelled) setCameraReady(true);
      })
      .catch(() => {
        if (!cancelled) setCameraReady(isCameraStreamLive(cameraStream));
      });

    return () => {
      cancelled = true;
    };
  }, [cameraStream]);

  const mixedRealityActive = Boolean(
    cameraEnabled && cameraStream && (cameraReady || isCameraStreamLive(cameraStream)),
  );

  return (
    <ColiseoStudentCameraSyncProvider value={teacherCameraSyncUi}>
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (backTarget) {
            navigate(backTarget);
            return;
          }
          navigate(-1);
        }}
        aria-label="Volver"
        className="fixed left-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/60 bg-slate-950/95 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] backdrop-blur-md transition hover:border-cyan-300 hover:bg-slate-900 hover:text-white"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          left: "max(1rem, env(safe-area-inset-left))",
        }}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => void toggleCamera()}
        aria-label={cameraEnabled ? "Desactivar camara" : "Activar camara"}
        title={cameraEnabled ? "Camara activa" : "Activar camara"}
        className={`fixed top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-slate-950/95 backdrop-blur-md transition ${
          cameraEnabled
            ? "border-emerald-400/70 text-emerald-200 shadow-[0_0_24px_-6px_rgba(16,185,129,0.85)] hover:border-emerald-300 hover:text-white"
            : "border-cyan-400/60 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] hover:border-cyan-300 hover:bg-slate-900 hover:text-white"
        }`}
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(5.75rem, calc(env(safe-area-inset-right) + 4.75rem))",
        }}
      >
        {cameraBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Camera className="h-5 w-5" aria-hidden />}
      </button>
      {cameraError && (
        <p
          className="pointer-events-none fixed top-16 z-30 max-w-[min(86vw,320px)] rounded-md border border-rose-400/40 bg-black/75 px-3 py-2 text-[11px] text-rose-200 backdrop-blur-sm"
          style={{
            right: "max(5.75rem, calc(env(safe-area-inset-right) + 4.75rem))",
          }}
        >
          {cameraError}
        </p>
      )}
      <video
        ref={cameraBackgroundRef}
        playsInline
        autoPlay
        muted
        aria-hidden
        style={
          cameraEnabled && cameraStream
            ? {
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
                pointerEvents: "none",
                opacity: mixedRealityActive ? 1 : 0.01,
              }
            : {
                position: "fixed",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
                overflow: "hidden",
              }
        }
      />
      <ColiseoImmersiveScene
        mixedRealityActive={mixedRealityActive}
        classSlug={classSlug}
        isTeacher={voiceRole === "host"}
      />
      <AgoraClassVoiceBridge classSlug={classSlug} role={voiceRole} />
    </div>
    </ColiseoStudentCameraSyncProvider>
  );
};

export default ColiseoPage;
