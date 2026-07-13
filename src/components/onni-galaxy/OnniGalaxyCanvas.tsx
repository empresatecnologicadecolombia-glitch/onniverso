import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import OnniGalaxyScene from "@/components/onni-galaxy/OnniGalaxyScene";
import type { OnniGalaxySize } from "@/components/onni-galaxy/types";
import type { OnniAvatarState } from "@/components/OnniAvatar";
import { applyPixelRatioCap } from "@/lib/webglRendererPrefs";
import { cn } from "@/lib/utils";

type OnniGalaxyCanvasProps = {
  size?: OnniGalaxySize;
  state?: OnniAvatarState;
  className?: string;
};

export default function OnniGalaxyCanvas({
  size = "md",
  state = "idle",
  className,
}: OnniGalaxyCanvasProps) {
  return (
    <div className={cn("relative h-full w-full min-h-0 min-w-0", className)}>
      <Canvas
        className="onni-galaxy-avatar__canvas !size-full touch-none"
        style={{ background: "transparent" }}
        dpr={[1, 2]}
        frameloop="always"
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          premultipliedAlpha: false,
        }}
        onCreated={({ gl, camera }) => {
          applyPixelRatioCap(gl);
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.NoToneMapping;
          camera.lookAt(0, 0, 0);
        }}
        camera={{ position: [0, 0.95, 1.7], fov: 48, near: 0.05, far: 12 }}
      >
        <ambientLight intensity={0.22} color="#1e3a5f" />
        <Suspense fallback={null}>
          <OnniGalaxyScene size={size} state={state} />
        </Suspense>
      </Canvas>
    </div>
  );
}
