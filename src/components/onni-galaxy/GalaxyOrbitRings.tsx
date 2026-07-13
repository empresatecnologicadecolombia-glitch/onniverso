import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GalaxyAnimState } from "@/components/onni-galaxy/types";

type GalaxyOrbitRingsProps = {
  animRef: React.MutableRefObject<GalaxyAnimState>;
};

const RING_DEFS: { radius: number; tube: number; tilt: [number, number, number]; color: string }[] = [
  { radius: 0.58, tube: 0.0045, tilt: [1.12, 0.28, 0.18], color: "#67e8f9" },
  { radius: 0.76, tube: 0.0036, tilt: [0.92, -0.32, 0.42], color: "#c084fc" },
  { radius: 0.94, tube: 0.003, tilt: [1.28, 0.48, -0.12], color: "#22d3ee" },
  { radius: 1.08, tube: 0.0022, tilt: [0.78, -0.18, 0.55], color: "#a855f7" },
];

export default function GalaxyOrbitRings({ animRef }: GalaxyOrbitRingsProps) {
  const rings = useMemo(
    () =>
      RING_DEFS.map((def) => {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(def.color),
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        return { def, mat };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const anim = animRef.current;
    const t = clock.elapsedTime;
    for (let i = 0; i < rings.length; i += 1) {
      const { mat } = rings[i]!;
      mat.opacity = (0.28 + i * 0.04) + Math.sin(t * 0.8 + i) * 0.05 * anim.coreIntensity;
    }
  });

  return (
    <group>
      {rings.map(({ def, mat }, i) => (
        <mesh key={i} rotation={def.tilt} material={mat} renderOrder={5}>
          <torusGeometry args={[def.radius, def.tube, 10, 128]} />
        </mesh>
      ))}
    </group>
  );
}
