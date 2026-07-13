import type { OnniGalaxySize } from "@/components/onni-galaxy/types";

export const GALAXY_SIZE_PX: Record<OnniGalaxySize, number> = {
  sm: 88,
  md: 110,
  lg: 110,
  hero: 336,
};

export type GalaxyParticleBudget = {
  spiral: number;
  sparkles: number;
  escape: number;
  nebula: number;
};

const BUDGET: Record<OnniGalaxySize, GalaxyParticleBudget> = {
  sm: { spiral: 720, sparkles: 120, escape: 36, nebula: 48 },
  md: { spiral: 1100, sparkles: 180, escape: 48, nebula: 64 },
  lg: { spiral: 1500, sparkles: 240, escape: 56, nebula: 80 },
  hero: { spiral: 2800, sparkles: 420, escape: 84, nebula: 140 },
};

export function galaxyParticleBudget(size: OnniGalaxySize): GalaxyParticleBudget {
  return BUDGET[size];
}
