import { createContext, useContext, type ReactNode } from "react";

export type ColiseoStudentCameraSyncUi = {
  studentsCamerasOn: boolean;
  studentsCamerasBusy: boolean;
  toggleStudentCameras: () => void;
};

const ColiseoStudentCameraSyncContext = createContext<ColiseoStudentCameraSyncUi | null>(null);

export function ColiseoStudentCameraSyncProvider({
  value,
  children,
}: {
  value: ColiseoStudentCameraSyncUi | null;
  children: ReactNode;
}) {
  return (
    <ColiseoStudentCameraSyncContext.Provider value={value}>{children}</ColiseoStudentCameraSyncContext.Provider>
  );
}

/** Panel docente (AgoraClassVoiceTeacherPanel) lee el control sin tocar AgoraClassVoiceBridge. */
export function useColiseoStudentCameraSyncUi(): ColiseoStudentCameraSyncUi | null {
  return useContext(ColiseoStudentCameraSyncContext);
}
