import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GalaxyParticleBuffers } from "@/components/onni-galaxy/lib/spiralGalaxy";
import {
  assignGalaxyStarAttributes,
  createGalaxyStarMaterial,
  updateGalaxyStarUniforms,
} from "@/components/onni-galaxy/shaders/galaxyPointMaterial";
import type { GalaxyAnimState } from "@/components/onni-galaxy/types";

type GalaxyParticleFieldProps = {
  buffers: GalaxyParticleBuffers;
  animRef: React.MutableRefObject<GalaxyAnimState>;
  opacityScale?: number;
  layer?: "spiral" | "sparkle";
};

const LAYER_SIZE_FACTOR = { spiral: 0.011, sparkle: 0.007 } as const;
const LAYER_BRIGHTNESS = { spiral: 1, sparkle: 0.8 } as const;

export default function GalaxyParticleField({
  buffers,
  animRef,
  opacityScale = 1,
  layer = "spiral",
}: GalaxyParticleFieldProps) {
  const material = useMemo(
    () => createGalaxyStarMaterial({ sizeFactor: LAYER_SIZE_FACTOR[layer] }),
    [layer],
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    assignGalaxyStarAttributes(geo, buffers);
    return geo;
  }, [buffers]);

  useFrame((state) => {
    const anim = animRef.current;
    updateGalaxyStarUniforms(
      material,
      state,
      state.clock.elapsedTime,
      anim.breath,
      LAYER_BRIGHTNESS[layer] * anim.coreIntensity * opacityScale,
    );
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
