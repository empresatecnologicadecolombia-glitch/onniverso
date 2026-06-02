export type Escena360VideoId = "acuario" | "espacio1" | "espacio2";

export type Escena360VideoOption = {
  id: Escena360VideoId;
  label: string;
  url: string;
};

/** Videos 360° en `public/videos/` para Escena 360 VR. */
export const ESCENA_360_VR_VIDEOS: readonly Escena360VideoOption[] = [
  { id: "acuario", label: "Acuario", url: "/videos/acuario.mp4" },
  { id: "espacio1", label: "Espacio 1", url: "/videos/espacio%201.mp4" },
  { id: "espacio2", label: "Espacio 2", url: "/videos/espacio2.mp4" },
] as const;

export const ESCENA_360_VR_TITLE = "Escena 360 VR";

/** Equilibrio: más abierto que el Coliseo (78°) sin efecto “pescado”. */
export const ESCENA_360_CAMERA_FOV = 96;
/** Menor = más alejado; ~1 = normal. */
export const ESCENA_360_CAMERA_ZOOM = 0.72;
