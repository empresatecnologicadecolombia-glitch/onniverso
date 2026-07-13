import type { OnniAvatarState } from "@/components/OnniAvatar";

export type OnniGalaxySize = "sm" | "md" | "lg" | "hero";

export type OnniGalaxySceneProps = {
  size: OnniGalaxySize;
  state?: OnniAvatarState;
};

export type GalaxyAnimState = {
  breath: number;
  rotSpeed: number;
  coreIntensity: number;
  nebulaOpacity: number;
};

export function galaxyAnimFromState(state: OnniAvatarState, elapsed: number): GalaxyAnimState {
  if (state === "listening") {
    return {
      breath: 1.06 + Math.sin(elapsed * 1.8) * 0.03,
      rotSpeed: 0.11,
      coreIntensity: 1.35,
      nebulaOpacity: 0.42,
    };
  }
  if (state === "speaking") {
    return {
      breath: 1 + Math.sin(elapsed * 2.4) * 0.07,
      rotSpeed: 0.095,
      coreIntensity: 1.22,
      nebulaOpacity: 0.38,
    };
  }
  return {
    breath: 1 + Math.sin(elapsed * 0.55) * 0.04,
    rotSpeed: 0.065,
    coreIntensity: 1,
    nebulaOpacity: 0.32,
  };
}
