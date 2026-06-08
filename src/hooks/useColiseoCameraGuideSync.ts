import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ColiseoGuidePoint,
  coliseoCameraGuideChannelName,
} from "@/lib/coliseoDocenteGuide";
import { supabase } from "@/integrations/supabase/client";

type CameraGuidePayload = {
  point?: ColiseoGuidePoint;
  senderId?: string;
};

function isGuidePoint(value: unknown): value is ColiseoGuidePoint {
  return value === 1 || value === 2 || value === 3;
}

export type ColiseoGuidePulse = {
  point: ColiseoGuidePoint;
  id: number;
};

export function useColiseoCameraGuideSync(classSlug: string, isTeacher: boolean) {
  const [guidePulse, setGuidePulse] = useState<ColiseoGuidePulse | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const selfUserIdRef = useRef("");
  const pulseIdRef = useRef(0);

  const emitGuidePulse = useCallback((point: ColiseoGuidePoint) => {
    pulseIdRef.current += 1;
    setGuidePulse({ point, id: pulseIdRef.current });
  }, []);

  const broadcastGuidePoint = useCallback(
    async (point: ColiseoGuidePoint) => {
      emitGuidePulse(point);
      if (!isTeacher || !classSlug.trim() || !channelRef.current || !selfUserIdRef.current) return;
      await channelRef.current.send({
        type: "broadcast",
        event: "camera-guide",
        payload: { point, senderId: selfUserIdRef.current },
      });
    },
    [classSlug, emitGuidePulse, isTeacher],
  );

  useEffect(() => {
    const slug = classSlug.trim().toLowerCase();
    if (!slug) {
      setGuidePulse(null);
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

      syncChannel = supabase.channel(coliseoCameraGuideChannelName(slug));
      channelRef.current = syncChannel;

      syncChannel
        .on("broadcast", { event: "camera-guide" }, ({ payload }) => {
          const command = (payload as CameraGuidePayload | null) ?? null;
          if (!command || command.senderId === user.id) return;
          if (!isGuidePoint(command.point)) return;
          emitGuidePulse(command.point);
        })
        .subscribe();
    };

    void setup();
    return () => {
      cancelled = true;
      channelRef.current = null;
      if (syncChannel) void supabase.removeChannel(syncChannel);
    };
  }, [classSlug, emitGuidePulse]);

  return { guidePulse, broadcastGuidePoint };
}
