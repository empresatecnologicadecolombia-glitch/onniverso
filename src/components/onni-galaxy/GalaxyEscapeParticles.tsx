import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildEscapeParticleSeeds } from "@/components/onni-galaxy/lib/spiralGalaxy";
import {
  createGalaxyStarMaterial,
  updateGalaxyStarUniforms,
} from "@/components/onni-galaxy/shaders/galaxyPointMaterial";
import type { GalaxyAnimState } from "@/components/onni-galaxy/types";

type GalaxyEscapeParticlesProps = {
  count: number;
  animRef: React.MutableRefObject<GalaxyAnimState>;
};

export default function GalaxyEscapeParticles({ count, animRef }: GalaxyEscapeParticlesProps) {
  const seeds = useMemo(() => buildEscapeParticleSeeds(count), [count]);
  const material = useMemo(
    () => createGalaxyStarMaterial({ sizeFactor: 0.009, brightness: 1.1 }),
    [],
  );

  const { geometry, positionAttr } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(seeds.positions.slice(), 3);
    geo.setAttribute("position", positionAttr);
    geo.setAttribute("aColor", new THREE.BufferAttribute(seeds.colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(seeds.sizes, 1));
    const phases = new Float32Array(count);
    const distNorm = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      phases[i] = seeds.phases[i]!;
      distNorm[i] = seeds.orbitBase[i]! / 0.6;
    }
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("aDistNorm", new THREE.BufferAttribute(distNorm, 1));
    return { geometry: geo, positionAttr };
  }, [count, seeds]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const anim = animRef.current;
    updateGalaxyStarUniforms(material, state, t, anim.breath, anim.coreIntensity * 1.05);

    // Escapan del nucleo y regresan: la orbita se expande y contrae en ciclos.
    const arr = positionAttr.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const phase = seeds.phases[i]!;
      const base = seeds.baseAngles[i]!;
      const orbit = seeds.orbitBase[i]! + Math.sin(t * 0.45 + phase) * 0.16;
      const angle = base + t * (0.22 + (i % 5) * 0.02);
      const lift = Math.sin(t * 0.55 + phase * 1.3) * 0.11;
      arr[i * 3] = Math.cos(angle) * orbit;
      arr[i * 3 + 1] = lift;
      arr[i * 3 + 2] = Math.sin(angle) * orbit;
    }
    positionAttr.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
