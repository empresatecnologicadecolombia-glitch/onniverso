export type ClassVideoSyncAction =
  | "play"
  | "pause"
  | "next"
  | "prev"
  | "camera_on"
  | "camera_off";

export type ClassVideoSyncCommand = {
  action?: ClassVideoSyncAction;
  senderId?: string;
  index?: number;
  shouldPlay?: boolean;
};

export function coliseoClassVideoSyncChannelName(classSlug: string): string {
  const slug = classSlug.trim().toLowerCase();
  return `class-video-sync-${slug || "main"}`;
}
