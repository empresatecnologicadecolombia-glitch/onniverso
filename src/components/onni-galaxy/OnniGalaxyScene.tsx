import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import GalaxyCore from "@/components/onni-galaxy/GalaxyCore";
import GalaxyEscapeParticles from "@/components/onni-galaxy/GalaxyEscapeParticles";
import GalaxyNebulaHaze from "@/components/onni-galaxy/GalaxyNebulaHaze";
import GalaxyParticleField from "@/components/onni-galaxy/GalaxyParticleField";
import { galaxyParticleBudget } from "@/components/onni-galaxy/lib/particleCounts";
import { buildSparkleBuffers, buildSpiralGalaxyBuffers } from "@/components/onni-galaxy/lib/spiralGalaxy";
import { galaxyAnimFromState, type GalaxyAnimState, type OnniGalaxySceneProps } from "@/components/onni-galaxy/types";

export default function OnniGalaxyScene({ size, state = "idle" }: OnniGalaxySceneProps) {
  const budget = galaxyParticleBudget(size);
  const animRef = useRef<GalaxyAnimState>(galaxyAnimFromState(state, 0));
  const stateRef = useRef(state);
  stateRef.current = state;

  const spiralBuffers = useMemo(() => buildSpiralGalaxyBuffers(budget.spiral), [budget.spiral]);
  const sparkleBuffers = useMemo(() => buildSparkleBuffers(budget.sparkles), [budget.sparkles]);

  const galaxyRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    animRef.current = galaxyAnimFromState(stateRef.current, clock.elapsedTime);
    if (galaxyRef.current) {
      const anim = animRef.current;
      const t = clock.elapsedTime;
      galaxyRef.current.rotation.x = 0.3 + Math.sin(t * 0.1) * 0.03;
      galaxyRef.current.rotation.z = Math.sin(t * 0.07) * 0.04;
      galaxyRef.current.rotation.y = 0.35 + t * anim.rotSpeed * 0.35;
      // Respiración: la galaxia entera late muy lento sin salirse del encuadre.
      galaxyRef.current.scale.setScalar(0.72 * anim.breath);
    }
  });

  return (
    <group ref={galaxyRef} rotation={[0.3, 0.35, 0]} scale={0.72}>
      <GalaxyNebulaHaze count={budget.nebula} animRef={animRef} />
      <GalaxyParticleField buffers={spiralBuffers} animRef={animRef} layer="spiral" />
      <GalaxyParticleField buffers={sparkleBuffers} animRef={animRef} opacityScale={0.8} layer="sparkle" />
      <GalaxyEscapeParticles count={budget.escape} animRef={animRef} />
      <GalaxyCore animRef={animRef} />
    </group>
  );
}
