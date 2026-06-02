export type ClassCameraSyncStatePayload = {
  enabled: boolean;
  teacherId: string;
};

export type ClassCameraOrientationPayload = {
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  teacherId: string;
};

export function buildClassCameraSyncChannel(classSlug: string): string {
  const slug = classSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  return `class-camera-sync-${slug || "main"}`;
}

export const CLASS_CAMERA_SYNC_MIN_INTERVAL_MS = 40;
