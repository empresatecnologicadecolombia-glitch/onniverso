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
  const remoteQuaternionRef = useRef(new THREE.Quaternion());
  const hasRemoteQuatRef = useRef(false);
  const selfUserIdRef = useRef("");
  const viewSyncEnabledRef = useRef(viewSyncEnabled);

  useEffect(() => {
    viewSyncEnabledRef.current = viewSyncEnabled;
  }, [viewSyncEnabled]);

  const sendOrientation = (channel: ReturnType<typeof supabase.channel>, senderId: string) => {
    void channel.send({
      type: "broadcast",
      event: "view-orientation",
      payload: {
        qx: camera.quaternion.x,
        qy: camera.quaternion.y,
        qz: camera.quaternion.z,
        qw: camera.quaternion.w,
        teacherId: senderId,
      } satisfies ClassCameraOrientationPayload,
    });
  };

  const sendSyncState = (
    channel: ReturnType<typeof supabase.channel>,
    enabled: boolean,
    senderId: string,
  ) => {
    void channel.send({
      type: "broadcast",
      event: "view-sync-state",
      payload: { enabled, teacherId: senderId } satisfies ClassCameraSyncStatePayload,
    });
    if (enabled) sendOrientation(channel, senderId);
  };

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
          if (!command.enabled) hasRemoteQuatRef.current = false;
        })
        .on("broadcast", { event: "view-orientation" }, ({ payload }) => {
          const command = payload as ClassCameraOrientationPayload | null;
          if (!command || command.teacherId === selfUserIdRef.current) return;
          if (isTeacher) return;
          remoteQuaternionRef.current.set(command.qx, command.qy, command.qz, command.qw);
          hasRemoteQuatRef.current = true;
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED" || !channel || cancelled) return;
          if (isTeacher && teacherId) {
            sendSyncState(channel, viewSyncEnabledRef.current, teacherId);
          }
        });
    };

    void setup();
    return () => {
      cancelled = true;
      channelRef.current = null;
      hasRemoteQuatRef.current = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [classSlug, isTeacher, onFollowingChange, teacherId]);

  useEffect(() => {
    if (!isTeacher || !channelRef.current || !teacherId) return;
    sendSyncState(channelRef.current, viewSyncEnabled, teacherId);
  }, [camera, isTeacher, teacherId, viewSyncEnabled]);

  useFrame(() => {
    const channel = channelRef.current;
    if (!channel || !teacherId) return;

    if (isTeacher && viewSyncEnabled) {
      const now = performance.now();
      if (now - lastSentAtRef.current < CLASS_CAMERA_SYNC_MIN_INTERVAL_MS) return;
      lastSentAtRef.current = now;
      sendOrientation(channel, teacherId);
      return;
    }

    if (!isTeacher && followingViewSync && hasRemoteQuatRef.current) {
      camera.quaternion.slerp(remoteQuaternionRef.current, 0.42);
      camera.updateMatrixWorld();
    }
  }, 1);

  return null;
}
