import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { applyPixelRatioCap, getAdaptiveSphereSegments } from "@/lib/webglRendererPrefs";
import { LOCKED_CENTRAL_SPHERE_RADIUS, LOCKED_MOON } from "@/config/lockedHomeLayout";

const EARTH_TEXTURES_BASE = "/assets/textures/earth";
const EARTH_DAY = `${EARTH_TEXTURES_BASE}/earth_day_4096.jpg`;
const EARTH_CLOUDS = `${EARTH_TEXTURES_BASE}/earth_clouds_1024.png`;
const MOON_TEXTURE_URL = "/assets/textures/moon/moon_1024.jpg";

const DEFAULT_ICON_PX = 82;

/** Misma proporción Tierra/Luna que el planeta central, escalado para caber en el icono. */
const SCENE_SCALE = 0.52;
const EARTH_RADIUS = LOCKED_CENTRAL_SPHERE_RADIUS * SCENE_SCALE;
const MOON_RADIUS = EARTH_RADIUS * 0.27;
const MOON_ORBIT_RADIUS = EARTH_RADIUS * LOCKED_MOON.orbitRadiusFactor;
const EARTH_ROTATION_SPEED = 0.1;
const MOON_ORBIT_SPEED = 0.22;

function MiniEarth() {
  const earthRef = useRef<THREE.Group>(null);
  const [dayMap, cloudsMap] = useLoader(THREE.TextureLoader, [EARTH_DAY, EARTH_CLOUDS]);
  const seg = getAdaptiveSphereSegments(false);

  useEffect(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 4;
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
  }, [dayMap, cloudsMap]);

  useFrame((_, delta) => {
    if (!earthRef.current) return;
    earthRef.current.rotation.y += delta * EARTH_ROTATION_SPEED;
  });

  return (
    <group ref={earthRef}>
      <mesh renderOrder={0}>
        <sphereGeometry args={[EARTH_RADIUS, seg, seg]} />
        <meshBasicMaterial map={dayMap} toneMapped={false} />
      </mesh>
      <mesh renderOrder={1} scale={1.002}>
        <sphereGeometry args={[EARTH_RADIUS, seg, seg]} />
        <meshBasicMaterial
          map={cloudsMap}
          transparent
          opacity={0.9}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function MiniOrbitingMoon() {
  const pivotRef = useRef<THREE.Group>(null);
  const moonTexture = useLoader(THREE.TextureLoader, MOON_TEXTURE_URL);
  const moonSeg = getAdaptiveSphereSegments(false);

  useEffect(() => {
    moonTexture.colorSpace = THREE.SRGBColorSpace;
    moonTexture.anisotropy = 4;
  }, [moonTexture]);

  useFrame((_, delta) => {
    if (pivotRef.current) {
      pivotRef.current.rotation.y += delta * MOON_ORBIT_SPEED;
    }
  });

  return (
    <group ref={pivotRef} rotation={[LOCKED_MOON.orbitTiltX, 0, 0]}>
      <mesh position={[MOON_ORBIT_RADIUS, LOCKED_MOON.meshY, 0]} renderOrder={2}>
        <sphereGeometry args={[MOON_RADIUS, moonSeg, moonSeg]} />
        <meshBasicMaterial map={moonTexture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function EarthMoonIconScene() {
  return (
    <group>
      <MiniEarth />
      <Suspense fallback={null}>
        <MiniOrbitingMoon />
      </Suspense>
    </group>
  );
}

type HomeEarthIconProps = {
  onOpenLobby: () => void;
  className?: string;
  sizePx?: number;
  /** Sin contenedor fixed; para incrustar en la columna de acciones. */
  embedded?: boolean;
  ariaLabel?: string;
  title?: string;
};

function EarthIconButton({
  onOpenLobby,
  className,
  sizePx,
  ariaLabel,
  title,
}: Required<Pick<HomeEarthIconProps, "onOpenLobby">> &
  Pick<HomeEarthIconProps, "className" | "sizePx" | "ariaLabel" | "title">) {
  const px = sizePx ?? DEFAULT_ICON_PX;

  return (
    <button
      type="button"
      onClick={onOpenLobby}
      className={cn(
        "pointer-events-auto relative block overflow-hidden border-0 bg-transparent p-0 outline-none",
        "transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-cyan-400/70",
        className,
      )}
      style={{ width: px, height: px }}
      aria-label={ariaLabel ?? "Abrir lobby inmersivo"}
      title={title ?? "Lobby inmersivo"}
    >
      <Canvas
        className="block h-full w-full touch-none"
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          premultipliedAlpha: false,
        }}
        onCreated={({ gl }) => {
          applyPixelRatioCap(gl);
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.NoToneMapping;
        }}
        camera={{ position: [0, 0, 2.18], fov: 48, near: 0.05, far: 20 }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[2.5, 1.2, 2]} intensity={0.35} color="#ffffff" />
        <Suspense fallback={null}>
          <EarthMoonIconScene />
        </Suspense>
      </Canvas>
    </button>
  );
}

/** Tierra + Luna como icono táctil (lobby / aula virtual). */
export default function HomeEarthCornerIcon({
  onOpenLobby,
  className,
  sizePx,
  embedded = false,
  ariaLabel,
  title,
}: HomeEarthIconProps) {
  if (embedded) {
    return (
      <EarthIconButton
        onOpenLobby={onOpenLobby}
        className={className}
        sizePx={sizePx}
        ariaLabel={ariaLabel}
        title={title}
      />
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-10 left-4 z-[78] max-sm:bottom-24 sm:bottom-8 sm:left-10",
        className,
      )}
    >
      <EarthIconButton
        onOpenLobby={onOpenLobby}
        sizePx={sizePx}
        ariaLabel={ariaLabel}
        title={title}
      />
    </div>
  );
}
