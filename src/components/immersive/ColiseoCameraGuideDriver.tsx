import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  COLOSSEO_CAMERA_GUIDE_ANIM_MS,
  COLOSSEO_GUIDE_LOOK_TARGETS,
  lookTargetToCameraPosition,
  syncOrbitControlsFromCamera,
} from "@/lib/coliseoDocenteGuide";
import type { ColiseoGuidePulse } from "@/hooks/useColiseoCameraGuideSync";

const DEFAULT_ORBIT_DISTANCE = 0.12;
const _fromPos = new THREE.Vector3();
const _toPos = new THREE.Vector3();

type AnimState = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  elapsed: number;
  duration: number;
};

/** Anima la cámara hacia la vista del punto de guía docente (1 = video, 2 = GLB, 3 = PDF). */
export default function ColiseoCameraGuideDriver({
  guidePulse,
}: {
  guidePulse: ColiseoGuidePulse | null;
}) {
  const { camera, controls } = useThree();
  const animRef = useRef<AnimState | null>(null);
  const lastPulseIdRef = useRef(0);

  useEffect(() => {
    if (!guidePulse || guidePulse.id === lastPulseIdRef.current) return;
    lastPulseIdRef.current = guidePulse.id;

    const distance = Math.max(camera.position.length(), DEFAULT_ORBIT_DISTANCE);
    const lookTarget = COLOSSEO_GUIDE_LOOK_TARGETS[guidePulse.point];
    _fromPos.copy(camera.position);
    _toPos.copy(lookTargetToCameraPosition(lookTarget, distance));

    animRef.current = {
      from: _fromPos.clone(),
      to: _toPos.clone(),
      elapsed: 0,
      duration: COLOSSEO_CAMERA_GUIDE_ANIM_MS / 1000,
    };
  }, [camera, guidePulse]);

  useFrame((_, delta) => {
    const anim = animRef.current;
    if (!anim) return;

    anim.elapsed += delta;
    const u = Math.min(1, anim.elapsed / anim.duration);
    const eased = 1 - (1 - u) ** 3;

    camera.position.lerpVectors(anim.from, anim.to, eased);
    camera.lookAt(0, 0, 0);

    if (u >= 1) {
      syncOrbitControlsFromCamera(camera, controls);
      animRef.current = null;
    }
  });

  return null;
}
