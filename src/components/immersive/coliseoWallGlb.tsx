import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import {
  EARTH_MOON_LOBBY_COLISEO_BUILD_OPTIONS,
  isEarthMoonLobbyGlbUrl,
  prepareEarthMoonLobbyColiseoMaterials,
} from "@/components/immersive/coliseoWallGlbMaterials";
import {
  COLISEO_CATALOG_GLB_OFFSET,
  buildColiseoWallModel,
} from "@/components/immersive/coliseoWallGlbNormalize";

const COLISEO_WALL_SPIN_SPEED = 0.35;

class GlbErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[ColiseoWallGlb] No se pudo cargar el modelo GLB:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function ColiseoWallGlbModel({
  url,
  prepareModel,
}: {
  url: string;
  prepareModel?: (root: THREE.Object3D) => void;
}) {
  const { scene } = useGLTF(url, false, false, (loader) => {
    loader.setCrossOrigin("anonymous");
  });

  const prepared = useMemo(() => {
    const earthMoon = isEarthMoonLobbyGlbUrl(url);
    const applyMaterials =
      prepareModel ?? (earthMoon ? prepareEarthMoonLobbyColiseoMaterials : undefined);
    const baked = buildColiseoWallModel(
      scene,
      applyMaterials,
      earthMoon ? EARTH_MOON_LOBBY_COLISEO_BUILD_OPTIONS : undefined,
    );
    if (!baked) {
      console.warn("[ColiseoWallGlb] Modelo no válido para la pared del Coliseo:", url);
    }
    return baked;
  }, [scene, url, prepareModel]);

  if (!prepared) return null;

  return <primitive object={prepared} raycast={() => null} />;
}

export function ColiseoWallGlb({
  url,
  prepareModel,
  spin = true,
}: {
  url: string;
  prepareModel?: (root: THREE.Object3D) => void;
  spin?: boolean;
}) {
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!spin || !spinRef.current) return;
    spinRef.current.rotation.y += delta * COLISEO_WALL_SPIN_SPEED;
  });

  return (
    <group ref={spinRef} position={COLISEO_CATALOG_GLB_OFFSET}>
      <GlbErrorBoundary key={url} fallback={null}>
        <Suspense fallback={null}>
          <ColiseoWallGlbModel key={url} url={url} prepareModel={prepareModel} />
        </Suspense>
      </GlbErrorBoundary>
    </group>
  );
}
