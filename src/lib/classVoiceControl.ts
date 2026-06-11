export type ClassVoiceControlAction = "grant_speak" | "revoke_speak";

export type ClassVoiceControlPayload = {
  action: ClassVoiceControlAction;
  targetUserId: string;
  teacherId: string;
};

export { buildClassVoiceControlChannel } from "@/lib/coliseoClassVoiceBaseline";
