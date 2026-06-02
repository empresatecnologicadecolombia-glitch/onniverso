import { OrbitControls } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SRGBColorSpace, TextureLoader } from "three";
import { OPTIMIZED_SPHERE_SEGMENTS } from "@/lib/webglRendererPrefs";

export const SPHERE_RADIUS = 420;

/** Esfera con textura equirectangular en el interior (BackSide). */
export function EquirectangularInterior({
  url,
  ...meshProps
}: { url: string } & JSX.IntrinsicElements["mesh"]) {
  const texture = useLoader(TextureLoader, url, (loader) => {
    loader.setCrossOrigin("anonymous");
  });
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  return (
    <mesh {...meshProps}>
      <sphereGeometry args={[SPHERE_RADIUS, OPTIMIZED_SPHERE_SEGMENTS, OPTIMIZED_SPHERE_SEGMENTS]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

/** Esfera interior con video equirectangular en loop. */
export function VideoEquirectangularInterior({
  url,
  withAudio = false,
  audioEnabled = false,
}: {
  url: string;
  /** Permite sonido (autoplay arranca en mute por política del navegador). */
  withAudio?: boolean;
  /** Controlado desde UI: true = video con sonido. */
  audioEnabled?: boolean;
}) {
  const { video, texture } = useMemo(() => {
    const element = document.createElement("video");
    element.src = url;
    element.crossOrigin = "anonymous";
    element.loop = true;
    element.muted = true;
    element.autoplay = true;
    element.playsInline = true;
    element.preload = "auto";
    if (withAudio) {
      element.volume = 1;
    }
    const videoTexture = new THREE.VideoTexture(element);
    videoTexture.colorSpace = SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;
    return { video: element, texture: videoTexture };
  }, [url, withAudio]);

  useEffect(() => {
    if (withAudio) {
      video.muted = !audioEnabled;
      video.volume = audioEnabled ? 1 : 0;
    }
    void video.play().catch(() => undefined);
  }, [audioEnabled, video, withAudio]);

  useEffect(() => {
    const resume = () => void video.play().catch(() => undefined);
    void video.play().catch(() => undefined);
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("touchstart", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("touchstart", resume);
      texture.dispose();
      video.pause();
      video.src = "";
      video.load();
    };
  }, [texture, video]);

  useFrame(() => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      texture.needsUpdate = true;
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[SPHERE_RADIUS, OPTIMIZED_SPHERE_SEGMENTS, OPTIMIZED_SPHERE_SEGMENTS]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

export function ImmersiveOrbitControls({ enabled = true }: { enabled?: boolean }) {
  return (
    <OrbitControls
      makeDefault
      enabled={enabled}
      enablePan={false}
      enableZoom
      enableDamping
      dampingFactor={0.055}
      rotateSpeed={0.28}
      minPolarAngle={0.02}
      maxPolarAngle={Math.PI - 0.02}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}
      target={[0, 0, 0]}
      minDistance={0.08}
      maxDistance={0.45}
    />
  );
}

/** Orbit para Escena 360 VR: un poco de zoom, sin acercar demasiado. */
export function Escena360OrbitControls({ enabled = true }: { enabled?: boolean }) {
  return (
    <OrbitControls
      makeDefault
      enabled={enabled}
      enablePan={false}
      enableZoom
      enableDamping
      dampingFactor={0.055}
      rotateSpeed={0.28}
      minPolarAngle={0.02}
      maxPolarAngle={Math.PI - 0.02}
      target={[0, 0, 0]}
      minDistance={0.28}
      maxDistance={0.62}
    />
  );
}
