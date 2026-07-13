import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GalaxyAnimState } from "@/components/onni-galaxy/types";

type GalaxyCoreProps = {
  animRef: React.MutableRefObject<GalaxyAnimState>;
};

export default function GalaxyCore({ animRef }: GalaxyCoreProps) {
  const innerRef = useRef<THREE.Mesh>(null);
  const cyanGlowRef = useRef<THREE.Mesh>(null);
  const magentaGlowRef = useRef<THREE.Mesh>(null);
  const outerHaloRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const innerMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ffffff"),
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  const cyanGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#22d3ee"),
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  const magentaGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#d946ef"),
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  const outerHaloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#6366f1"),
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const anim = animRef.current;
    const pulse = anim.breath * Math.min(anim.coreIntensity, 1);
    const t = clock.elapsedTime;

    if (innerRef.current) {
      const s = 0.072 * pulse * (1 + Math.sin(t * 0.9) * 0.04);
      innerRef.current.scale.setScalar(s);
      innerMat.opacity = 0.72 + Math.sin(t * 1.1) * 0.04;
    }
    if (cyanGlowRef.current) {
      const s = 0.18 * pulse * (1 + Math.sin(t * 0.7 + 0.4) * 0.03);
      cyanGlowRef.current.scale.setScalar(s);
      cyanGlowMat.opacity = 0.32 * Math.min(anim.coreIntensity, 1);
    }
    if (magentaGlowRef.current) {
      const s = 0.28 * pulse;
      magentaGlowRef.current.scale.setScalar(s);
      magentaGlowMat.opacity = 0.14 * Math.min(anim.coreIntensity, 1);
    }
    if (outerHaloRef.current) {
      const s = 0.4 * pulse * (1 + Math.sin(t * 0.45) * 0.03);
      outerHaloRef.current.scale.setScalar(s);
      outerHaloMat.opacity = 0.08 * anim.nebulaOpacity * Math.min(anim.coreIntensity, 1);
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.2 * Math.min(anim.coreIntensity, 1);
    }
  });

  return (
    <group>
      <mesh ref={outerHaloRef} material={outerHaloMat} renderOrder={1}>
        <sphereGeometry args={[1, 20, 20]} />
      </mesh>
      <mesh ref={magentaGlowRef} material={magentaGlowMat} renderOrder={2}>
        <sphereGeometry args={[1, 18, 18]} />
      </mesh>
      <mesh ref={cyanGlowRef} material={cyanGlowMat} renderOrder={3}>
        <sphereGeometry args={[1, 20, 20]} />
      </mesh>
      <mesh ref={innerRef} material={innerMat} renderOrder={4}>
        <sphereGeometry args={[1, 24, 24]} />
      </mesh>
      <pointLight ref={lightRef} color="#e0ffff" intensity={1.2} distance={2.6} decay={2} />
    </group>
  );
}
