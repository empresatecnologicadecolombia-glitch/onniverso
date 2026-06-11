/** Sincronización docente → alumnos: encender/apagar la cámara local (canal aparte de voz y video MP4). */

export type StudentCameraSyncAction = "camera_on" | "camera_off";

export type StudentCameraSyncCommand = {
  action: StudentCameraSyncAction;
  teacherId: string;
  senderId: string;
};

export const COLISEO_STUDENT_CAMERA_SYNC_EVENT = "student-camera-control";

export function buildColiseoStudentCameraSyncChannel(classSlug: string): string {
  const slug = classSlug.trim() || "main";
  return `class-student-camera-${slug}`;
}
