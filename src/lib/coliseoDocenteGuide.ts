import * as THREE from "three";
import { COLOSSEO_FLOATING_SCREEN_POSITION } from "@/data/coliseoScene";

export type ColiseoGuidePoint = 1 | 2 | 3;

/** Centro visual de cada recurso (no la posición de los botones de guía). */
export const COLOSSEO_GUIDE_LOOK_TARGETS: Record<ColiseoGuidePoint, [number, number, number]> = {
  1: COLOSSEO_FLOATING_SCREEN_POSITION,
  2: [10.5, 1.95, -0.42],
  3: [-10.5, 1.35, -0.35],
};

export const COLOSSEO_CAMERA_GUIDE_ANIM_MS = 1500;

export function isColiseoGuidePoint(value: unknown): value is ColiseoGuidePoint {
  return value === 1 || value === 2 || value === 3;
}

export type ColiseoGuidePresenceMeta = {
  userId?: string;
  role?: string;
  lastGuidePoint?: ColiseoGuidePoint;
  guideAt?: number;
};

/** El punto más reciente publicado por otro participante (p. ej. docente). */
export function pickLatestColiseoGuideFromPresence(
  state: Record<string, ColiseoGuidePresenceMeta[]>,
  selfUserId: string,
): { point: ColiseoGuidePoint; guideAt: number } | null {
  let best: { point: ColiseoGuidePoint; guideAt: number } | null = null;
  for (const metas of Object.values(state)) {
    for (const meta of metas) {
      if (meta.userId === selfUserId) continue;
      if (!isColiseoGuidePoint(meta.lastGuidePoint) || typeof meta.guideAt !== "number") continue;
      if (!best || meta.guideAt > best.guideAt) {
        best = { point: meta.lastGuidePoint, guideAt: meta.guideAt };
      }
    }
  }
  return best;
}

export function coliseoCameraGuideChannelName(classSlug: string): string {
  const slug = classSlug.trim().toLowerCase() || "main";
  return `class-camera-guide-${slug}`;
}

/** Posición de cámara en órbita para mirar hacia `lookTarget` con `target` en el origen. */
export function lookTargetToCameraPosition(
  lookTarget: [number, number, number],
  distance: number,
): THREE.Vector3 {
  const dir = new THREE.Vector3(...lookTarget).normalize();
  return dir.negate().multiplyScalar(distance);
}

export function syncOrbitControlsFromCamera(
  camera: THREE.Camera,
  controls: THREE.EventDispatcher | null | undefined,
): void {
  if (!controls || !("setAzimuthalAngle" in controls) || !("setPolarAngle" in controls)) return;
  const orbit = controls as THREE.EventDispatcher & {
    setAzimuthalAngle: (angle: number) => void;
    setPolarAngle: (angle: number) => void;
    update: () => void;
  };
  const spherical = new THREE.Spherical().setFromVector3(camera.position);
  orbit.setAzimuthalAngle(spherical.theta);
  orbit.setPolarAngle(spherical.phi);
  orbit.update();
}
