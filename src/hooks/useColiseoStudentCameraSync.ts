import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildColiseoStudentCameraSyncChannel,
  COLISEO_STUDENT_CAMERA_SYNC_EVENT,
  type StudentCameraSyncCommand,
} from "@/lib/coliseoStudentCameraSync";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type UseColiseoStudentCameraSyncOptions = {
  classSlug: string;
  role: "host" | "audience" | null;
  cameraEnabled: boolean;
  cameraBusy: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
};

export function useColiseoStudentCameraSync({
  classSlug,
  role,
  cameraEnabled,
  cameraBusy,
  startCamera,
  stopCamera,
}: UseColiseoStudentCameraSyncOptions) {
  const [studentsCamerasOn, setStudentsCamerasOn] = useState(false);
  const [studentsCamerasBusy, setStudentsCamerasBusy] = useState(false);

  const cameraEnabledRef = useRef(cameraEnabled);
  const cameraBusyRef = useRef(cameraBusy);
  const startCameraRef = useRef(startCamera);
  const stopCameraRef = useRef(stopCamera);
  const teacherChannelRef = useRef<RealtimeChannel | null>(null);
  const selfUserIdRef = useRef<string | null>(null);

  cameraEnabledRef.current = cameraEnabled;
  cameraBusyRef.current = cameraBusy;
  startCameraRef.current = startCamera;
  stopCameraRef.current = stopCamera;

  useEffect(() => {
    if (role !== "audience" || !classSlug.trim()) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const userId = data.user?.id ?? "";
      if (!userId) return;
      selfUserIdRef.current = userId;

      channel = supabase.channel(buildColiseoStudentCameraSyncChannel(classSlug));
      channel
        .on("broadcast", { event: COLISEO_STUDENT_CAMERA_SYNC_EVENT }, ({ payload }) => {
          const command = payload as StudentCameraSyncCommand | null;
          if (!command?.action || command.senderId === userId) return;

          if (command.action === "camera_on") {
            if (cameraEnabledRef.current || cameraBusyRef.current) return;
            void startCameraRef.current();
            return;
          }

          if (command.action === "camera_off" && cameraEnabledRef.current) {
            stopCameraRef.current();
          }
        })
        .subscribe();

      if (cancelled && channel) {
        void supabase.removeChannel(channel);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [classSlug, role]);

  useEffect(() => {
    if (role !== "host" || !classSlug.trim()) {
      teacherChannelRef.current = null;
      return;
    }

    let cancelled = false;
    const channel = supabase.channel(buildColiseoStudentCameraSyncChannel(classSlug));
    teacherChannelRef.current = channel;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      selfUserIdRef.current = data.user?.id ?? null;
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      teacherChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [classSlug, role]);

  const toggleStudentCameras = useCallback(async () => {
    if (role !== "host" || !classSlug.trim() || studentsCamerasBusy) return;

    const channel = teacherChannelRef.current;
    const teacherId = selfUserIdRef.current;
    if (!channel || !teacherId) return;

    const nextOn = !studentsCamerasOn;
    setStudentsCamerasBusy(true);
    try {
      const status = await channel.send({
        type: "broadcast",
        event: COLISEO_STUDENT_CAMERA_SYNC_EVENT,
        payload: {
          action: nextOn ? "camera_on" : "camera_off",
          teacherId,
          senderId: teacherId,
        } satisfies StudentCameraSyncCommand,
      });
      if (status !== "ok") return;
      setStudentsCamerasOn(nextOn);
    } finally {
      setStudentsCamerasBusy(false);
    }
  }, [classSlug, role, studentsCamerasBusy, studentsCamerasOn]);

  return {
    studentsCamerasOn,
    studentsCamerasBusy,
    toggleStudentCameras,
  };
}
