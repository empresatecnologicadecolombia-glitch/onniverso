import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { OnniAvatarState } from "@/components/OnniAvatar";

type OnniAvatarDotsProps = {
  size?: "sm" | "md" | "lg";
  state?: OnniAvatarState;
  className?: string;
  title?: string;
};

const sizeBox = {
  sm: "h-10 w-10",
  md: "h-[55px] w-[55px]",
  lg: "h-[70px] w-[70px]",
} as const;

type Vec3 = { x: number; y: number; z: number };

const PARTICLE_COUNT = 112;
const MORPH_MS = 5200;
const CANVAS_PX = 110;
const WORLD_SCALE = 0.425;
/** Tiempo en cada figura antes de empezar a transformarse */
const HOLD_RATIO = 0.74;

function vecLen(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z) || 1;
}

function sortBySpherical(pts: Vec3[]): Vec3[] {
  return [...pts].sort((a, b) => {
    const la = vecLen(a);
    const lb = vecLen(b);
    const pa = Math.acos(Math.max(-1, Math.min(1, a.y / la)));
    const pb = Math.acos(Math.max(-1, Math.min(1, b.y / lb)));
    if (Math.abs(pa - pb) > 0.0001) return pa - pb;
    return Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x);
  });
}

function scaleToFit(pts: Vec3[], target = 0.9): Vec3[] {
  let maxR = 0;
  for (const p of pts) maxR = Math.max(maxR, vecLen(p));
  if (maxR < 0.001) return pts;
  const s = target / maxR;
  return pts.map((p) => ({ x: p.x * s, y: p.y * s, z: p.z * s }));
}

function buildSphere(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  const r = 0.9;
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    pts.push({ x: Math.cos(theta) * ring * r, y: y * r, z: Math.sin(theta) * ring * r });
  }
  return pts;
}

function buildCube(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const half = 0.82;
  const perFace = Math.ceil(count / 6);
  const grid = Math.ceil(Math.sqrt(perFace));

  for (let face = 0; face < 6 && pts.length < count; face += 1) {
    for (let gi = 0; gi < grid && pts.length < count; gi += 1) {
      for (let gj = 0; gj < grid && pts.length < count; gj += 1) {
        const a = grid === 1 ? 0 : (gi / (grid - 1)) * 2 - 1;
        const b = grid === 1 ? 0 : (gj / (grid - 1)) * 2 - 1;
        switch (face) {
          case 0:
            pts.push({ x: a * half, y: b * half, z: half });
            break;
          case 1:
            pts.push({ x: a * half, y: b * half, z: -half });
            break;
          case 2:
            pts.push({ x: half, y: a * half, z: b * half });
            break;
          case 3:
            pts.push({ x: -half, y: a * half, z: b * half });
            break;
          case 4:
            pts.push({ x: a * half, y: half, z: b * half });
            break;
          default:
            pts.push({ x: a * half, y: -half, z: b * half });
        }
      }
    }
  }

  while (pts.length < count) {
    const t = pts.length;
    const edge = t % 12;
    const u = (edge / 12) * Math.PI * 2;
    pts.push({ x: Math.cos(u) * half, y: Math.sin(u * 2) * half * 0.3, z: Math.sin(u) * half });
  }

  return sortBySpherical(pts.slice(0, count));
}

function buildTorus(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const R = 0.56;
  const r = 0.24;
  const uSteps = Math.ceil(Math.sqrt(count * (R / r)));
  const vSteps = Math.ceil(count / uSteps);

  for (let ui = 0; ui < uSteps && pts.length < count; ui += 1) {
    for (let vi = 0; vi < vSteps && pts.length < count; vi += 1) {
      const u = (ui / uSteps) * Math.PI * 2;
      const v = (vi / vSteps) * Math.PI * 2;
      pts.push({
        x: (R + r * Math.cos(v)) * Math.cos(u),
        y: r * Math.sin(v),
        z: (R + r * Math.cos(v)) * Math.sin(u),
      });
    }
  }

  while (pts.length < count) {
    const i = pts.length;
    const u = (i / count) * Math.PI * 2;
    const v = ((i * 0.618) % 1) * Math.PI * 2;
    pts.push({
      x: (R + r * Math.cos(v)) * Math.cos(u),
      y: r * Math.sin(v),
      z: (R + r * Math.cos(v)) * Math.sin(u),
    });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function buildHelix(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const perStrand = Math.floor(count / 2);
  const turns = 2.25;
  const strandR = 0.28;
  const sep = 0.34;
  const height = 1.55;

  for (let strand = 0; strand < 2; strand += 1) {
    const sign = strand === 0 ? 1 : -1;
    for (let i = 0; i < perStrand; i += 1) {
      const t = i / Math.max(perStrand - 1, 1);
      const angle = t * Math.PI * 2 * turns + (strand === 1 ? Math.PI : 0);
      const y = t * height - height / 2;
      pts.push({
        x: Math.cos(angle) * strandR + sign * sep,
        y,
        z: Math.sin(angle) * strandR,
      });
    }
  }

  while (pts.length < count) {
    const t = pts.length / count;
    pts.push({
      x: Math.cos(t * 14) * 0.35,
      y: t * 1.4 - 0.7,
      z: Math.sin(t * 14) * 0.35,
    });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function trianglePoint(a: Vec3, b: Vec3, c: Vec3, u: number, v: number): Vec3 {
  const w = 1 - u - v;
  return {
    x: a.x * w + b.x * u + c.x * v,
    y: a.y * w + b.y * u + c.y * v,
    z: a.z * w + b.z * u + c.z * v,
  };
}

function fillTriangle(
  pts: Vec3[],
  a: Vec3,
  b: Vec3,
  c: Vec3,
  count: number,
  max: number,
): void {
  const grid = Math.ceil(Math.sqrt(count * 2));
  for (let gi = 0; gi < grid && pts.length < max; gi += 1) {
    for (let gj = 0; gj < grid && pts.length < max; gj += 1) {
      const u = grid === 1 ? 0 : gi / (grid - 1);
      const v = grid === 1 ? 0 : gj / (grid - 1);
      if (u + v > 1) continue;
      pts.push(trianglePoint(a, b, c, u, v));
    }
  }
}

function buildPyramid(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const b = 0.78;
  const baseY = -0.52;
  const apex: Vec3 = { x: 0, y: 0.88, z: 0 };
  const corners = [
    { x: -b, z: -b },
    { x: b, z: -b },
    { x: b, z: b },
    { x: -b, z: b },
  ];

  const baseQuota = Math.floor(count * 0.22);
  const grid = Math.ceil(Math.sqrt(baseQuota));
  for (let gi = 0; gi < grid && pts.length < baseQuota; gi += 1) {
    for (let gj = 0; gj < grid && pts.length < baseQuota; gj += 1) {
      const a = grid === 1 ? 0 : (gi / (grid - 1)) * 2 - 1;
      const c = grid === 1 ? 0 : (gj / (grid - 1)) * 2 - 1;
      pts.push({ x: a * b, y: baseY, z: c * b });
    }
  }

  const sideQuota = Math.ceil((count - pts.length) / 4);
  for (let face = 0; face < 4 && pts.length < count; face += 1) {
    const c0 = corners[face]!;
    const c1 = corners[(face + 1) % 4]!;
    const p0: Vec3 = { x: c0.x, y: baseY, z: c0.z };
    const p1: Vec3 = { x: c1.x, y: baseY, z: c1.z };
    fillTriangle(pts, p0, p1, apex, sideQuota, count);
  }

  while (pts.length < count) {
    const t = pts.length / count;
    pts.push({ x: Math.cos(t * 9) * b * 0.4, y: baseY + t * 1.3, z: Math.sin(t * 9) * b * 0.4 });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function buildOctahedron(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const top: Vec3 = { x: 0, y: 0.88, z: 0 };
  const bottom: Vec3 = { x: 0, y: -0.88, z: 0 };
  const px: Vec3 = { x: 0.78, y: 0, z: 0 };
  const nx: Vec3 = { x: -0.78, y: 0, z: 0 };
  const pz: Vec3 = { x: 0, y: 0, z: 0.78 };
  const nz: Vec3 = { x: 0, y: 0, z: -0.78 };

  const faces: [Vec3, Vec3, Vec3][] = [
    [top, px, pz],
    [top, pz, nx],
    [top, nx, nz],
    [top, nz, px],
    [bottom, pz, px],
    [bottom, nx, pz],
    [bottom, nz, nx],
    [bottom, px, nz],
  ];

  const perFace = Math.ceil(count / faces.length);
  for (const [a, b, c] of faces) {
    if (pts.length >= count) break;
    fillTriangle(pts, a, b, c, perFace, count);
  }

  while (pts.length < count) {
    const t = pts.length / count;
    const a = t * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 0.55, y: Math.sin(t * 14) * 0.75, z: Math.sin(a) * 0.55 });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function buildCone(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const apexY = 0.88;
  const baseY = -0.52;
  const baseR = 0.74;

  const ringCount = Math.floor(count * 0.28);
  for (let i = 0; i < ringCount; i += 1) {
    const a = (i / ringCount) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * baseR, y: baseY, z: Math.sin(a) * baseR });
  }

  const sideCount = count - ringCount;
  const rings = Math.max(2, Math.ceil(Math.sqrt(sideCount)));
  for (let ri = 1; ri <= rings && pts.length < count; ri += 1) {
    const t = ri / rings;
    const y = baseY + (apexY - baseY) * t;
    const r = baseR * (1 - t);
    const onRing = Math.ceil(sideCount / rings);
    for (let ai = 0; ai < onRing && pts.length < count; ai += 1) {
      const a = (ai / onRing) * Math.PI * 2 + t * 0.6;
      pts.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r });
    }
  }

  while (pts.length < count) {
    const t = pts.length / count;
    const y = baseY + (apexY - baseY) * t;
    const r = baseR * (1 - t) * 0.85;
    pts.push({ x: Math.cos(t * 16) * r, y, z: Math.sin(t * 16) * r });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function buildGalaxy(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const arms = 3;
  const coreQuota = Math.floor(count * 0.14);

  for (let i = 0; i < coreQuota; i += 1) {
    const t = i / Math.max(coreQuota - 1, 1);
    const r = t * 0.2;
    const a = t * Math.PI * 7;
    pts.push({
      x: Math.cos(a) * r,
      y: Math.sin(t * 15) * 0.07,
      z: Math.sin(a) * r,
    });
  }

  const armQuota = count - coreQuota;
  const perArm = Math.ceil(armQuota / arms);
  const turns = 2.6;

  for (let arm = 0; arm < arms; arm += 1) {
    const armPhase = (arm / arms) * Math.PI * 2;
    for (let i = 0; i < perArm && pts.length < count; i += 1) {
      const t = (i + 1) / perArm;
      const radius = 0.18 + t * 0.74;
      const angle = armPhase + t * Math.PI * 2 * turns;
      const lift = (t - 0.5) * 0.42;
      const wobbleY = Math.sin(t * 11 + arm * 1.7) * 0.05 * (1 - t * 0.35);
      pts.push({
        x: Math.cos(angle) * radius,
        y: lift + wobbleY,
        z: Math.sin(angle) * radius,
      });
    }
  }

  while (pts.length < count) {
    const t = pts.length / count;
    const radius = 0.22 + t * 0.58;
    const angle = t * Math.PI * 2 * 3.2;
    pts.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(t * 9) * 0.18,
      z: Math.sin(angle) * radius,
    });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

const SHAPES = [
  buildSphere,
  buildCube,
  buildTorus,
  buildHelix,
  buildPyramid,
  buildOctahedron,
  buildCone,
  buildGalaxy,
].map((fn) => sortBySpherical(fn(PARTICLE_COUNT)));

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** 0 = figura pura; sube solo en la ventana final del ciclo */
function morphBlendT(localT: number): number {
  if (localT < HOLD_RATIO) return 0;
  return easeInOut((localT - HOLD_RATIO) / (1 - HOLD_RATIO));
}

function morphShapes(from: Vec3[], to: Vec3[], t: number): Vec3[] {
  if (t <= 0) return from;
  if (t >= 1) return to;
  return from.map((p, i) => {
    const q = to[i] ?? p;
    return {
      x: lerp(p.x, q.x, t),
      y: lerp(p.y, q.y, t),
      z: lerp(p.z, q.z, t),
    };
  });
}

function wobble(p: Vec3, i: number, elapsed: number, morphing: boolean): Vec3 {
  const t = elapsed * 0.0016;
  const amp = morphing ? 0.028 : 0.006;
  return {
    x: p.x + Math.sin(t + i * 0.73) * amp,
    y: p.y + Math.cos(t * 1.07 + i * 0.51) * amp,
    z: p.z + Math.sin(t * 0.89 + i * 0.37) * amp,
  };
}

function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function rotateZ(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

/** Morph: Esfera → Cubo → Toro → ADN → Pirámide → Diamante → Cono → Galaxia → Esfera… */
export default function OnniAvatarDots({
  size = "md",
  state = "idle",
  className,
  title = "Onni",
}: OnniAvatarDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_PX * dpr;
    canvas.height = CANVAS_PX * dpr;

    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = now - start;
      const morphSpeed =
        stateRef.current === "listening" ? 0.9 : stateRef.current === "speaking" ? 1.08 : 1;

      const cycle = (elapsed * morphSpeed) / MORPH_MS;
      const shapeIndex = ((Math.floor(cycle) % SHAPES.length) + SHAPES.length) % SHAPES.length;
      const nextIndex = (shapeIndex + 1) % SHAPES.length;
      const localT = cycle - Math.floor(cycle);
      const blendT = morphBlendT(localT);
      const morphing = blendT > 0.02;

      const base = morphShapes(SHAPES[shapeIndex]!, SHAPES[nextIndex]!, blendT);

      const rotY = elapsed * 0.00062 * morphSpeed;
      const rotX = 0.52 + Math.sin(elapsed * 0.00041) * 0.28;
      const rotZ = 0.18 + Math.sin(elapsed * 0.00033 + 1.2) * 0.14;

      const projected = base.map((p, i) => {
        let v = wobble(p, i, elapsed, morphing);
        v = rotateY(v, rotY);
        v = rotateX(v, rotX);
        v = rotateZ(v, rotZ);
        const depth = 2.6 / (2.6 + v.z);
        return { x: v.x * depth, y: v.y * depth, z: v.z, depth };
      });

      projected.sort((a, b) => a.z - b.z);

      const w = CANVAS_PX;
      const h = CANVAS_PX;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const scale = w * WORLD_SCALE;
      const pulse =
        stateRef.current === "speaking" ? 1 + Math.sin(elapsed * 0.012) * 0.05 : 1;

      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.05);
      halo.addColorStop(0, "rgba(34, 211, 238, 0.12)");
      halo.addColorStop(1, "rgba(34, 211, 238, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      for (const pt of projected) {
        const px = cx + pt.x * scale * pulse;
        const py = cy + pt.y * scale * pulse;
        const depthNorm = (pt.z + 1.15) / 2.3;
        const radius = Math.max(
          0.72,
          (0.9 + pt.depth * 1.45) * (stateRef.current === "listening" ? 1.12 : 1),
        );
        const alpha = Math.max(0.38, 0.4 + depthNorm * 0.52);

        const g = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.4);
        g.addColorStop(0, `rgba(224, 254, 255, ${alpha})`);
        g.addColorStop(0.45, `rgba(34, 211, 238, ${alpha * 0.88})`);
        g.addColorStop(1, "rgba(99, 102, 241, 0)");

        ctx.beginPath();
        ctx.fillStyle = g;
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const coreR = Math.max(2, 2.1 * pulse * (stateRef.current === "listening" ? 1.15 : 1));
      ctx.beginPath();
      ctx.fillStyle = "rgba(34, 211, 238, 0.92)";
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "rgba(236, 254, 255, 0.85)";
      ctx.arc(cx, cy, coreR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={cn("onni-dots-avatar relative shrink-0", sizeBox[size], className)}
      data-state={state}
      role="img"
      aria-label={title}
    >
      <canvas ref={canvasRef} className="onni-dots-avatar__canvas h-full w-full" aria-hidden />
    </div>
  );
}
