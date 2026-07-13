import * as THREE from "three";

/** Paleta del brief: cian/blanco núcleo → azul eléctrico → violeta/magenta. */
export const GALAXY_PALETTE = {
  coreWhite: new THREE.Color("#FFFFFF"),
  coreCyan: new THREE.Color("#00FFFF"),
  electricBlue: new THREE.Color("#0077FF"),
  magenta: new THREE.Color("#FF00FF"),
  hotPink: new THREE.Color("#FF66EE"),
  turquoise: new THREE.Color("#22D3EE"),
  deepPurple: new THREE.Color("#6622AA"),
  darkBlue: new THREE.Color("#001133"),
} as const;

const ARM_PALETTES = [
  { inner: "#FFFFFF", mid: "#FF66EE", outer: "#AA22CC" },
  { inner: "#E0FFFF", mid: "#2288FF", outer: "#0044AA" },
  { inner: "#FFFFFF", mid: "#CC66FF", outer: "#6622AA" },
  { inner: "#88DDFF", mid: "#3399FF", outer: "#2255CC" },
] as const;

export function lerpGalaxyColor(t: number, out = new THREE.Color()): THREE.Color {
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped < 0.35) {
    return out.copy(GALAXY_PALETTE.coreWhite).lerp(GALAXY_PALETTE.coreCyan, clamped / 0.35);
  }
  if (clamped < 0.65) {
    return out
      .copy(GALAXY_PALETTE.coreCyan)
      .lerp(GALAXY_PALETTE.electricBlue, (clamped - 0.35) / 0.3);
  }
  if (clamped < 0.85) {
    return out
      .copy(GALAXY_PALETTE.electricBlue)
      .lerp(GALAXY_PALETTE.magenta, (clamped - 0.65) / 0.2);
  }
  return out.copy(GALAXY_PALETTE.magenta).lerp(GALAXY_PALETTE.deepPurple, (clamped - 0.85) / 0.15);
}

export function lerpArmColor(arm: number, t: number, out = new THREE.Color()): THREE.Color {
  const palette = ARM_PALETTES[arm % ARM_PALETTES.length]!;
  const clamped = Math.min(1, Math.max(0, t));
  const inner = new THREE.Color(palette.inner);
  const mid = new THREE.Color(palette.mid);
  const outer = new THREE.Color(palette.outer);
  if (clamped < 0.42) {
    return out.copy(inner).lerp(mid, clamped / 0.42);
  }
  return out.copy(mid).lerp(outer, (clamped - 0.42) / 0.58);
}
