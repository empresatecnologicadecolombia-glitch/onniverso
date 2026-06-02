import { PointerLockControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Escena360CameraSetup from "@/components/immersive/Escena360CameraSetup";
import {
  Escena360OrbitControls,
  SPHERE_RADIUS,
  VideoEquirectangularInterior,
} from "@/components/immersive/equirectSphereCore";
import {
  ESCENA_360_CAMERA_FOV,
  ESCENA_360_CAMERA_ZOOM,
  ESCENA_360_VR_TITLE,
  ESCENA_360_VR_VIDEOS,
} from "@/data/escena360vrVideos";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_WEBGL_PIXEL_RATIO,
  applyPixelRatioCap,
  isMobileCoarseDevice,
  lobbyUsesPointerLockControls,
} from "@/lib/webglRendererPrefs";

function Escena360SceneContent({
  videoUrl,
  audioEnabled,
}: {
  videoUrl: string;
  audioEnabled: boolean;
}) {
  return (
    <>
      <Escena360CameraSetup />
      <Suspense fallback={null}>
        <VideoEquirectangularInterior
          key={videoUrl}
          url={videoUrl}
          withAudio
          audioEnabled={audioEnabled}
        />
      </Suspense>
      <ambientLight intensity={0.68} />
    </>
  );
}

/** Escena 360 VR: video equirectangular con selector Acuario / Espacio 1 / Espacio 2. */
export default function ColiseoBareImmersiveScene() {
  const [videoIndex, setVideoIndex] = useState(0);
  const [audioOn, setAudioOn] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const usesPointerLock = useMemo(() => lobbyUsesPointerLockControls(), []);
  const mobileCoarse = useMemo(() => isMobileCoarseDevice(), []);

  const activeVideo = ESCENA_360_VR_VIDEOS[videoIndex] ?? ESCENA_360_VR_VIDEOS[0];

  const handleEscape = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleEscape();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleEscape]);

  const onSelectVideo = useCallback((index: number) => {
    if (document.pointerLockElement) document.exitPointerLock();
    setVideoIndex(index);
  }, []);

  useEffect(() => {
    const enableAudioOnGesture = () => setAudioOn(true);
    window.addEventListener("pointerdown", enableAudioOnGesture, { once: true });
    window.addEventListener("touchstart", enableAudioOnGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", enableAudioOnGesture);
      window.removeEventListener("touchstart", enableAudioOnGesture);
    };
  }, []);

  return (
    <div className="relative h-[100dvh] w-full bg-black [&_*]:outline-none">
      <Canvas
        className="relative z-10 touch-none"
        gl={{ antialias: !mobileCoarse, alpha: true, powerPreference: "high-performance" }}
        camera={{
          position: [0, 0, 0.01],
          fov: ESCENA_360_CAMERA_FOV,
          zoom: ESCENA_360_CAMERA_ZOOM,
          far: SPHERE_RADIUS * 2,
        }}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        onCreated={({ gl }) => applyPixelRatioCap(gl)}
      >
        <Suspense fallback={null}>
          <Escena360SceneContent videoUrl={activeVideo.url} audioEnabled={audioOn} />
        </Suspense>
        {usesPointerLock ? (
          <PointerLockControls
            onLock={() => setPointerLocked(true)}
            onUnlock={() => setPointerLocked(false)}
          />
        ) : (
          <Escena360OrbitControls enabled />
        )}
      </Canvas>

      {usesPointerLock && pointerLocked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 mix-blend-difference" />
      )}

      <button
        type="button"
        onClick={() => setAudioOn((on) => !on)}
        className={cn(
          "pointer-events-auto absolute right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition",
          audioOn
            ? "border-violet-200/80 bg-violet-600/85 text-white"
            : "border-white/30 bg-black/60 text-violet-100",
        )}
        style={{ top: "max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem))" }}
        aria-label={audioOn ? "Silenciar audio" : "Activar audio"}
        title={audioOn ? "Silenciar" : "Activar audio"}
        data-escena-360-ui="true"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {audioOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </button>

      <div
        className="pointer-events-auto absolute bottom-6 left-1/2 z-30 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-3"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        data-escena-360-ui="true"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {ESCENA_360_VR_VIDEOS.map((option, index) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelectVideo(index)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition",
              index === videoIndex
                ? "border-violet-200/90 bg-violet-600/90 text-white shadow-[0_0_20px_rgba(139,92,246,0.65)]"
                : "border-white/25 bg-black/55 text-violet-100/90 hover:border-violet-300/50 hover:bg-violet-950/70",
            )}
            aria-pressed={index === videoIndex}
            aria-label={`Cambiar textura a ${option.label}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="pointer-events-none absolute bottom-[4.5rem] left-1/2 z-10 max-w-md -translate-x-1/2 px-4 text-center text-[11px] text-slate-400">
        {ESCENA_360_VR_TITLE} · {activeVideo.label}
        {usesPointerLock ? " · Clic para girar" : " · Arrastra para girar"}
      </p>
    </div>
  );
}
