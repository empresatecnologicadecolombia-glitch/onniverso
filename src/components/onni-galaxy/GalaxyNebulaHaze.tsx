import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildNebulaCloudBuffers } from "@/components/onni-galaxy/lib/spiralGalaxy";
import {
  assignGalaxyStarAttributes,
  createGalaxyStarMaterial,
  updateGalaxyStarUniforms,
} from "@/components/onni-galaxy/shaders/galaxyPointMaterial";
import type { GalaxyAnimState } from "@/components/onni-galaxy/types";

type GalaxyNebulaHazeProps = {
  count: number;
  animRef: React.MutableRefObject<GalaxyAnimState>;
};

export default function GalaxyNebulaHaze({ count, animRef }: GalaxyNebulaHazeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const buffers = useMemo(() => buildNebulaCloudBuffers(count), [count]);
  const material = useMemo(() => createGalaxyStarMaterial({ sizeFactor: 0.014 }), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    assignGalaxyStarAttributes(geo, buffers);
    return geo;
  }, [buffers]);

  useFrame((state) => {
    const anim = animRef.current;
    const t = state.clock.elapsedTime;
    updateGalaxyStarUniforms(
      material,
      state,
      t * 0.35,
      anim.breath * 1.05,
      anim.nebulaOpacity * anim.coreIntensity * 1.4,
    );
    if (groupRef.current) {
      groupRef.current.rotation.y = -t * anim.rotSpeed * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
