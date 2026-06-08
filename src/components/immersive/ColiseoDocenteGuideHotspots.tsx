import { Html } from "@react-three/drei";
import { COLOSSEO_FLOATING_SCREEN_POSITION } from "@/data/coliseoScene";
import type { ColiseoGuidePoint } from "@/lib/coliseoDocenteGuide";

/** Un poco más abajo que la versión que ya veías (0.42 / 0.38), sin esconderlos. */
const LOWER_BY = 2.18;

const VIDEO_GUIDE_POSITION: [number, number, number] = [
  COLOSSEO_FLOATING_SCREEN_POSITION[0],
  0.42 - LOWER_BY,
  COLOSSEO_FLOATING_SCREEN_POSITION[2] + 0.55,
];

/** Solo el botón 2: extra bajo 1 y 3. */
const GLB_EXTRA_LOWER_BY = 1.0;

const GLB_GUIDE_POSITION: [number, number, number] = [
  10.28,
  0.38 - LOWER_BY - GLB_EXTRA_LOWER_BY,
  -0.42,
];

/** Solo el botón 3: extra bajo 1 y 2. */
const PDF_EXTRA_LOWER_BY = 2.8;

const PDF_GUIDE_POSITION: [number, number, number] = [
  -10.28,
  0.38 - LOWER_BY - PDF_EXTRA_LOWER_BY,
  -0.35,
];

type GuideHotspotProps = {
  label: string;
  point: ColiseoGuidePoint;
  position: [number, number, number];
  onSelect: (point: ColiseoGuidePoint) => void;
};

function GuideHotspot({ label, point, position, onSelect }: GuideHotspotProps) {
  return (
    <group position={position}>
      <Html
        center
        sprite
        distanceFactor={10}
        zIndexRange={[52, 53]}
        style={{ pointerEvents: "auto" }}
      >
        <button
          type="button"
          aria-label={`Guiar clase al punto ${label}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onSelect(point)}
          className="flex h-12 min-w-12 items-center justify-center rounded-full border-2 border-cyan-200 bg-cyan-600 px-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(8,145,178,0.55)] transition hover:bg-cyan-500 hover:shadow-[0_4px_18px_rgba(8,145,178,0.75)] active:scale-95"
        >
          {label}
        </button>
      </Html>
    </group>
  );
}

/** Botones de guía docente: al pulsar, todos miran video (1), GLB (2) o PDF (3). */
export default function ColiseoDocenteGuideHotspots({
  onSelectPoint,
}: {
  onSelectPoint: (point: ColiseoGuidePoint) => void;
}) {
  return (
    <>
      <GuideHotspot label="1" point={1} position={VIDEO_GUIDE_POSITION} onSelect={onSelectPoint} />
      <GuideHotspot label="2" point={2} position={GLB_GUIDE_POSITION} onSelect={onSelectPoint} />
      <GuideHotspot label="3" point={3} position={PDF_GUIDE_POSITION} onSelect={onSelectPoint} />
    </>
  );
}
