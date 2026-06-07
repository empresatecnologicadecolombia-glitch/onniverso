import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { applyPixelRatioCap, getAdaptiveSphereSegments } from "@/lib/webglRendererPrefs";

const EARTH_TEXTURES_BASE = "/assets/textures/earth";
const EARTH_DAY = `${EARTH_TEXTURES_BASE}/earth_day_4096.jpg`;
const EARTH_CLOUDS = `${EARTH_TEXTURES_BASE}/earth_clouds_1024.png`;
const MOON_TEXTURE_URL = "/assets/textures/moon/moon_1024.jpg";

/** 72px −25 % ≈ 54px */
const ICON_PX = 54;
const ICON_PX_MOBILE = 48;

const EARTH_RADIUS = 0.72;
const MOON_RADIUS = EARTH_RADIUS * 0.27;
const MOON_ORBIT_RADIUS = EARTH_RADIUS * 1.72;
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
        <meshBasicMaterial map={dayMap} toneMapped />
      </mesh>
      <mesh renderOrder={1} scale={1.002}>
        <sphereGeometry args={[EARTH_RADIUS, seg, seg]} />
        <meshBasicMaterial map={cloudsMap} transparent opacity={0.9} depthWrite={false} toneMapped />
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
    <group ref={pivotRef}>
      <mesh position={[MOON_ORBIT_RADIUS, 0, 0]} renderOrder={2}>
        <sphereGeometry args={[MOON_RADIUS, moonSeg, moonSeg]} />
        <meshBasicMaterial map={moonTexture} toneMapped />
      </mesh>
    </group>
  );
}

function EarthMoonIconScene() {
  return (
    <group scale={0.92}>
      <MiniEarth />
      <Suspense fallback={null}>
        <MiniOrbitingMoon />
      </Suspense>
    </group>
  );
}

type HomeEarthCornerIconProps = {
  onOpenLobby: () => void;
  className?: string;
};

/** Tierra + Luna en esquina inferior izquierda (icono); tap abre lobby inmersivo. */
export default function HomeEarthCornerIcon({ onOpenLobby, className }: HomeEarthCornerIconProps) {
  return (
    <button
      type="button"
      onClick={onOpenLobby}
      className={cn(
        "pointer-events-auto fixed bottom-10 left-4 z-[79] flex h-[54px] w-[54px] items-center justify-center overflow-visible border-0 bg-transparent p-0 outline-none",
        "shadow-[0_0_18px_rgba(56,189,248,0.4)] transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-cyan-400/70",
        "max-sm:bottom-12 max-sm:h-12 max-sm:w-12 sm:bottom-8 sm:left-10",
        className,
      )}
      aria-label="Abrir lobby inmersivo"
      title="Lobby inmersivo"
    >
      <Canvas
        className="h-full w-full touch-none overflow-visible"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          applyPixelRatioCap(gl);
          gl.setClearColor(0x000000, 0);
        }}
        camera={{ position: [0, 0, 3.05], fov: 44, near: 0.1, far: 20 }}
        style={{ width: ICON_PX, height: ICON_PX }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[2.5, 1.2, 2]} intensity={1.15} color="#eef3fb" />
        <Suspense fallback={null}>
          <EarthMoonIconScene />
        </Suspense>
      </Canvas>
    </button>
  );
}
