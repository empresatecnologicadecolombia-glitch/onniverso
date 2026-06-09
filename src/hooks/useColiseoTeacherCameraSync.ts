import { useCallback, useEffect, useRef } from "react";
import {
  coliseoClassVideoSyncChannelName,
  type ClassVideoSyncCommand,
} from "@/lib/coliseoClassVideoSync";
import { supabase } from "@/integrations/supabase/client";

export function useColiseoTeacherCameraSync(
  classSlug: string,
  isTeacher: boolean,
  onRemoteCameraChange: (enabled: boolean) => void,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const selfUserIdRef = useRef("");
  const onRemoteCameraChangeRef = useRef(onRemoteCameraChange);
  onRemoteCameraChangeRef.current = onRemoteCameraChange;

  const broadcastCamera = useCallback(
    async (enabled: boolean) => {
      if (!isTeacher || !classSlug.trim() || !channelRef.current || !selfUserIdRef.current) return;
      await channelRef.current.send({
        type: "broadcast",
        event: "video-control",
        payload: {
          action: enabled ? "camera_on" : "camera_off",
          senderId: selfUserIdRef.current,
        } satisfies ClassVideoSyncCommand,
      });
    },
    [classSlug, isTeacher],
  );

  useEffect(() => {
    const slug = classSlug.trim().toLowerCase();
    if (!slug) {
      channelRef.current = null;
      return;
    }

    let cancelled = false;
    let syncChannel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user || cancelled) return;
      selfUserIdRef.current = user.id;

      syncChannel = supabase.channel(coliseoClassVideoSyncChannelName(slug));
      channelRef.current = syncChannel;

      syncChannel
        .on("broadcast", { event: "video-control" }, ({ payload }) => {
          if (isTeacher) return;
          const command = (payload as ClassVideoSyncCommand | null) ?? null;
          if (!command || command.senderId === user.id) return;
          if (command.action === "camera_on") onRemoteCameraChangeRef.current(true);
          if (command.action === "camera_off") onRemoteCameraChangeRef.current(false);
        })
        .subscribe();
    };

    void setup();
    return () => {
      cancelled = true;
      channelRef.current = null;
      if (syncChannel) void supabase.removeChannel(syncChannel);
    };
  }, [classSlug, isTeacher]);

  return { broadcastCamera };
}
