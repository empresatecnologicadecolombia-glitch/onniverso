import * as THREE from "three";
import { lerpArmColor, lerpGalaxyColor } from "@/components/onni-galaxy/lib/colors";

export type GalaxyParticleBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  distNorm: Float32Array;
};

function gaussian(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * 0.35;
}

/** Brazos logarítmicos + núcleo denso para la galaxia ONI. */
export function buildSpiralGalaxyBuffers(count: number, arms = 4): GalaxyParticleBuffers {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const distNorm = new Float32Array(count);

  const coreCount = Math.floor(count * 0.14);
  const armCount = count - coreCount;
  const perArm = Math.ceil(armCount / arms);
  const turns = 2.75;
  const tmpColor = new THREE.Color();

  let idx = 0;

  for (let i = 0; i < coreCount; i += 1) {
    const t = i / Math.max(coreCount - 1, 1);
    const r = Math.pow(Math.random(), 0.55) * 0.16;
    const a = Math.random() * Math.PI * 2;
    // Bulbo central con volumen (mas grueso que los brazos).
    const y = gaussian() * 0.07 * (1 - r * 2);
    positions[idx * 3] = Math.cos(a) * r;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = Math.sin(a) * r;

    lerpGalaxyColor(t * 0.25, tmpColor).toArray(colors, idx * 3);
    sizes[idx] = 2.4 + Math.random() * 1.8;
    phases[idx] = Math.random() * Math.PI * 2;
    distNorm[idx] = t * 0.2;
    idx += 1;
  }

  for (let arm = 0; arm < arms; arm += 1) {
    const armPhase = (arm / arms) * Math.PI * 2;
    for (let j = 0; j < perArm && idx < count; j += 1) {
      const t = (j + 1) / perArm;
      const radius = 0.12 + Math.pow(t, 0.82) * 0.88;
      const theta = armPhase + t * Math.PI * 2 * turns;
      const spread = (0.04 + t * 0.11) * (0.65 + Math.random() * 0.7);
      const jitterA = gaussian() * spread;
      const jitterR = gaussian() * spread * 0.35;

      const x = Math.cos(theta) * (radius + jitterR) + Math.cos(theta + Math.PI / 2) * jitterA;
      const z = Math.sin(theta) * (radius + jitterR) + Math.sin(theta + Math.PI / 2) * jitterA;
      const y = gaussian() * 0.07 * (1.15 - t * 0.4) + Math.sin(theta * 0.5) * 0.02;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      lerpArmColor(arm, 0.12 + t * 0.88, tmpColor);
      let size = 0.85 + (1 - t) * 1.6 + Math.random() * 0.9;
      // Estrellas calientes: puntos grandes casi blancos repartidos en los brazos.
      if (Math.random() < 0.06) {
        size *= 2.3;
        tmpColor.lerp(new THREE.Color("#ffffff"), 0.62);
      }
      tmpColor.toArray(colors, idx * 3);
      sizes[idx] = size;
      phases[idx] = Math.random() * Math.PI * 2;
      distNorm[idx] = t;
      idx += 1;
    }
  }

  while (idx < count) {
    const t = idx / count;
    const radius = 0.2 + t * 0.65;
    const angle = t * Math.PI * 2 * 3.1;
    positions[idx * 3] = Math.cos(angle) * radius;
    positions[idx * 3 + 1] = gaussian() * 0.08;
    positions[idx * 3 + 2] = Math.sin(angle) * radius;
    lerpGalaxyColor(t, tmpColor).toArray(colors, idx * 3);
    sizes[idx] = 1 + Math.random();
    phases[idx] = Math.random() * Math.PI * 2;
    distNorm[idx] = t;
    idx += 1;
  }

  return { positions, colors, sizes, phases, distNorm };
}

export function buildSparkleBuffers(count: number): GalaxyParticleBuffers {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const distNorm = new Float32Array(count);
  const phi = Math.PI * (3 - Math.sqrt(5));
  const tmpColor = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i * 1.13;
    const r = 0.55 + ((i * 0.173) % 0.55);
    positions[i * 3] = Math.cos(theta) * ring * r;
    positions[i * 3 + 1] = y * r * 0.55 + Math.sin(i * 1.7) * 0.06;
    positions[i * 3 + 2] = Math.sin(theta) * ring * r;

    lerpGalaxyColor(0.35 + (i % 7) * 0.08, tmpColor).toArray(colors, i * 3);
    sizes[i] = 0.35 + (i % 5) * 0.12;
    phases[i] = Math.random() * Math.PI * 2;
    distNorm[i] = r / 1.1;
  }

  return { positions, colors, sizes, phases, distNorm };
}

export type EscapeParticleSeed = {
  positions: Float32Array;
  baseAngles: Float32Array;
  phases: Float32Array;
  orbitBase: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
};

export function buildEscapeParticleSeeds(count: number): EscapeParticleSeed {
  const positions = new Float32Array(count * 3);
  const baseAngles = new Float32Array(count);
  const phases = new Float32Array(count);
  const orbitBase = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const orbit = 0.22 + Math.random() * 0.38;
    baseAngles[i] = angle;
    phases[i] = Math.random() * Math.PI * 2;
    orbitBase[i] = orbit;
    positions[i * 3] = Math.cos(angle) * orbit;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
    positions[i * 3 + 2] = Math.sin(angle) * orbit;
    lerpGalaxyColor(0.08 + Math.random() * 0.35, tmpColor).toArray(colors, i * 3);
    sizes[i] = 1.1 + Math.random() * 0.8;
  }

  return { positions, baseAngles, phases, orbitBase, colors, sizes };
}

/**
 * Nubes de gas: la mayoria siguen los brazos espirales (mismo trazado que las
 * estrellas) para que los brazos brillen en magenta/azul como la referencia;
 * el resto forma un halo difuso violeta.
 */
export function buildNebulaCloudBuffers(count: number, arms = 4): GalaxyParticleBuffers {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const distNorm = new Float32Array(count);
  const tmpColor = new THREE.Color();
  const turns = 2.75;

  const armClouds = Math.floor(count * 0.72);

  for (let i = 0; i < armClouds; i += 1) {
    const arm = i % arms;
    const armPhase = (arm / arms) * Math.PI * 2;
    const t = 0.12 + Math.random() * 0.88;
    const radius = 0.12 + Math.pow(t, 0.82) * 0.88;
    const theta = armPhase + t * Math.PI * 2 * turns;
    const spread = 0.05 + t * 0.1;

    positions[i * 3] = Math.cos(theta) * radius + gaussian() * spread;
    positions[i * 3 + 1] = gaussian() * 0.05;
    positions[i * 3 + 2] = Math.sin(theta) * radius + gaussian() * spread;

    lerpArmColor(arm, 0.3 + t * 0.7, tmpColor).toArray(colors, i * 3);
    sizes[i] = 7 + Math.random() * 9;
    phases[i] = Math.random() * Math.PI * 2;
    distNorm[i] = t;
  }

  for (let i = armClouds; i < count; i += 1) {
    const r = 0.15 + Math.random() * 0.75;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.24;
    positions[i * 3 + 2] = Math.sin(a) * r;
    lerpGalaxyColor(0.45 + Math.random() * 0.4, tmpColor).toArray(colors, i * 3);
    sizes[i] = 6 + Math.random() * 10;
    phases[i] = Math.random() * Math.PI * 2;
    distNorm[i] = r;
  }

  return { positions, colors, sizes, phases, distNorm };
}
