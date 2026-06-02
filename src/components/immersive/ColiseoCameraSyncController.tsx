import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  buildClassCameraSyncChannel,
  CLASS_CAMERA_SYNC_MIN_INTERVAL_MS,
  type ClassCameraOrientationPayload,
  type ClassCameraSyncStatePayload,
} from "@/lib/classCameraSync";
import { supabase } from "@/integrations/supabase/client";

type ColiseoCameraSyncControllerProps = {
  classSlug: string;
  isTeacher: boolean;
  viewSyncEnabled: boolean;
  followingViewSync: boolean;
  teacherId: string;
  onFollowingChange: (following: boolean) => void;
};

export default function ColiseoCameraSyncController({
  classSlug,
  isTeacher,
  viewSyncEnabled,
  followingViewSync,
  teacherId,
  onFollowingChange,
}: ColiseoCameraSyncControllerProps) {
  const { camera } = useThree();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentAtRef = useRef(0);
  const remoteOrientationRef = useRef({ yaw: 0, pitch: 0 });
  const selfUserIdRef = useRef("");

  useEffect(() => {
    if (!classSlug.trim()) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const channelName = buildClassCameraSyncChannel(classSlug);

    const setup = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user || cancelled) return;
      selfUserIdRef.current = user.id;

      channel = supabase.channel(channelName);
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "view-sync-state" }, ({ payload }) => {
          const command = payload as ClassCameraSyncStatePayload | null;
          if (!command || command.teacherId === selfUserIdRef.current) return;
          if (isTeacher) return;
          onFollowingChange(command.enabled);
        })
        .on("broadcast", { event: "view-orientation" }, ({ payload }) => {
          const command = payload as ClassCameraOrientationPayload | null;
          if (!command || command.teacherId === selfUserIdRef.current) return;
          if (isTeacher) return;
          remoteOrientationRef.current = { yaw: command.yaw, pitch: command.pitch };
        })
        .subscribe();
    };

    void setup();
    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [classSlug, isTeacher, onFollowingChange]);

  useEffect(() => {
    if (!isTeacher || !channelRef.current || !teacherId) return;
    void channelRef.current.send({
      type: "broadcast",
      event: "view-sync-state",
      payload: { enabled: viewSyncEnabled, teacherId } satisfies ClassCameraSyncStatePayload,
    });
    if (viewSyncEnabled) {
      void channelRef.current.send({
        type: "broadcast",
        event: "view-orientation",
        payload: {
          yaw: camera.rotation.y,
          pitch: camera.rotation.x,
          teacherId,
        } satisfies ClassCameraOrientationPayload,
      });
    }
  }, [camera, isTeacher, teacherId, viewSyncEnabled]);

  useFrame(() => {
    const channel = channelRef.current;
    if (!channel || !teacherId) return;

    if (isTeacher && viewSyncEnabled) {
      const now = performance.now();
      if (now - lastSentAtRef.current < CLASS_CAMERA_SYNC_MIN_INTERVAL_MS) return;
      lastSentAtRef.current = now;
      void channel.send({
        type: "broadcast",
        event: "view-orientation",
        payload: {
          yaw: camera.rotation.y,
          pitch: camera.rotation.x,
          teacherId,
        } satisfies ClassCameraOrientationPayload,
      });
      return;
    }

    if (!isTeacher && followingViewSync) {
      const target = remoteOrientationRef.current;
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, target.yaw, 0.4);
      camera.rotation.x = THREE.MathUtils.lerp(
        camera.rotation.x,
        THREE.MathUtils.clamp(target.pitch, -1.45, 1.45),
        0.4,
      );
    }
  });

  return null;
}
