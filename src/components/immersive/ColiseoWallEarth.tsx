import { useMemo } from "react";
import { LobbyDecorEarth } from "@/components/lobby/LobbyDecorEarthMoon";
import { isMobileCoarseDevice } from "@/lib/webglRendererPrefs";

/** Globo terráqueo en el marco de la pared (misma posición que el corazón, un poco más grande). */
const COLISEO_EARTH_SCALE = 2.95;

export function ColiseoWallEarth() {
  const simpleGpu = useMemo(() => isMobileCoarseDevice(), []);

  return (
    <group scale={COLISEO_EARTH_SCALE}>
      <LobbyDecorEarth simpleGpu={simpleGpu} />
    </group>
  );
}
