import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ColiseoGuidePoint,
  coliseoCameraGuideChannelName,
  isColiseoGuidePoint,
  pickLatestColiseoGuideFromPresence,
  type ColiseoGuidePresenceMeta,
} from "@/lib/coliseoDocenteGuide";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type CameraGuidePayload = {
  point?: ColiseoGuidePoint;
  senderId?: string;
  guideAt?: number;
};

const GUIDE_BROADCAST_RETRIES = 4;
const GUIDE_SEND_RETRY_MS = 200;
const GUIDE_SUBSCRIBE_TIMEOUT_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export type ColiseoGuidePulse = {
  point: ColiseoGuidePoint;
  id: number;
};

export function useColiseoCameraGuideSync(classSlug: string, isTeacher: boolean) {
  const [guidePulse, setGuidePulse] = useState<ColiseoGuidePulse | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelReadyRef = useRef(false);
  const selfUserIdRef = useRef("");
  const isTeacherRef = useRef(isTeacher);
  const pulseIdRef = useRef(0);
  const lastAppliedGuideAtRef = useRef(0);
  const lastTeacherGuideRef = useRef<{ point: ColiseoGuidePoint; guideAt: number } | null>(null);

  isTeacherRef.current = isTeacher;

  const emitGuidePulse = useCallback((point: ColiseoGuidePoint) => {
    pulseIdRef.current += 1;
    setGuidePulse({ point, id: pulseIdRef.current });
  }, []);

  const applyRemoteGuide = useCallback(
    (point: ColiseoGuidePoint, guideAt?: number) => {
      if (typeof guideAt === "number") {
        if (guideAt <= lastAppliedGuideAtRef.current) return;
        lastAppliedGuideAtRef.current = guideAt;
      }
      emitGuidePulse(point);
    },
    [emitGuidePulse],
  );

  const waitForChannelReady = useCallback(async (): Promise<boolean> => {
    if (channelReadyRef.current) return true;
    const deadline = Date.now() + GUIDE_SUBSCRIBE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (channelReadyRef.current) return true;
      await sleep(100);
    }
    return channelReadyRef.current;
  }, []);

  const sendGuideBroadcast = useCallback(
    async (point: ColiseoGuidePoint, guideAt: number) => {
      if (!selfUserIdRef.current) return;

      const payload: CameraGuidePayload = {
        point,
        senderId: selfUserIdRef.current,
        guideAt,
      };

      for (let attempt = 0; attempt < GUIDE_BROADCAST_RETRIES; attempt += 1) {
        if (attempt > 0) await sleep(GUIDE_SEND_RETRY_MS * attempt);
        if (!channelRef.current) return;
        if (!(await waitForChannelReady())) continue;

        const status = await channelRef.current.send({
          type: "broadcast",
          event: "camera-guide",
          payload,
        });
        if (status === "ok") return;
      }
    },
    [waitForChannelReady],
  );

  const publishTeacherGuideState = useCallback(
    async (point: ColiseoGuidePoint, guideAt: number) => {
      const channel = channelRef.current;
      if (!channel || !selfUserIdRef.current || !isTeacherRef.current) return;
      if (!(await waitForChannelReady())) return;

      await channel.track({
        userId: selfUserIdRef.current,
        role: "teacher",
        lastGuidePoint: point,
        guideAt,
      } satisfies ColiseoGuidePresenceMeta);
    },
    [waitForChannelReady],
  );

  const broadcastGuidePoint = useCallback(
    async (point: ColiseoGuidePoint) => {
      const guideAt = Date.now();
      lastTeacherGuideRef.current = { point, guideAt };
      emitGuidePulse(point);

      if (!isTeacherRef.current || !classSlug.trim()) return;

      await sendGuideBroadcast(point, guideAt);
      await publishTeacherGuideState(point, guideAt);
    },
    [classSlug, emitGuidePulse, publishTeacherGuideState, sendGuideBroadcast],
  );

  useEffect(() => {
    const slug = classSlug.trim().toLowerCase();
    if (!slug) {
      setGuidePulse(null);
      channelRef.current = null;
      channelReadyRef.current = false;
      lastAppliedGuideAtRef.current = 0;
      return;
    }

    let cancelled = false;
    let syncChannel: RealtimeChannel | null = null;
    channelReadyRef.current = false;
    lastAppliedGuideAtRef.current = 0;

    const applyPresenceGuide = () => {
      if (cancelled || !syncChannel || isTeacherRef.current) return;
      const latest = pickLatestColiseoGuideFromPresence(
        syncChannel.presenceState() as Record<string, ColiseoGuidePresenceMeta[]>,
        selfUserIdRef.current,
      );
      if (!latest) return;
      applyRemoteGuide(latest.point, latest.guideAt);
    };

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;
      selfUserIdRef.current = user.id;

      let teacherMode = isTeacherRef.current;
      if (!teacherMode) {
        const { data: aulaRow } = await supabase
          .from("aulas_virtuales" as any)
          .select("docente_id")
          .eq("slug", slug)
          .maybeSingle();
        if (cancelled) return;
        teacherMode = (aulaRow as { docente_id?: string } | null)?.docente_id === user.id;
      }
      if (teacherMode) isTeacherRef.current = true;

      syncChannel = supabase.channel(coliseoCameraGuideChannelName(slug), {
        config: { presence: { key: user.id } },
      });
      channelRef.current = syncChannel;

      syncChannel
        .on("broadcast", { event: "camera-guide" }, ({ payload }) => {
          const command = (payload as CameraGuidePayload | null) ?? null;
          if (!command || command.senderId === user.id) return;
          if (!isColiseoGuidePoint(command.point)) return;
          applyRemoteGuide(command.point, command.guideAt);
        })
        .on("presence", { event: "sync" }, applyPresenceGuide)
        .on("presence", { event: "join" }, applyPresenceGuide)
        .subscribe(async (status) => {
          if (cancelled) return;
          channelReadyRef.current = status === "SUBSCRIBED";
          if (status !== "SUBSCRIBED" || !syncChannel) return;

          if (teacherMode) {
            const last = lastTeacherGuideRef.current;
            await syncChannel.track(
              last
                ? ({
                    userId: user.id,
                    role: "teacher",
                    lastGuidePoint: last.point,
                    guideAt: last.guideAt,
                  } satisfies ColiseoGuidePresenceMeta)
                : ({
                    userId: user.id,
                    role: "teacher",
                  } satisfies ColiseoGuidePresenceMeta),
            );
            return;
          }

          applyPresenceGuide();
        });
    };

    void setup();
    return () => {
      cancelled = true;
      channelReadyRef.current = false;
      channelRef.current = null;
      if (syncChannel) void supabase.removeChannel(syncChannel);
    };
  }, [classSlug, applyRemoteGuide]);

  return { guidePulse, broadcastGuidePoint };
}
