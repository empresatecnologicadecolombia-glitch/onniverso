/**
 * Layout congelado — Videos educativos (/nuestras-salas).
 * NO es el panel docente. Cambiar solo con petición explícita del usuario.
 *
 * Fuente única de verdad para estructura y dimensiones de página + grid.
 * Las tarjetas usan VideosEducativosVideoCard.tsx (misma escala tipográfica).
 */

/** Raíz de página: evita desborde horizontal en móvil. */
export const VIDEOS_EDUCATIVOS_PAGE_ROOT_CLASS =
  "relative min-h-screen w-full overflow-x-hidden overflow-y-auto bg-background";

/** Main: px-4 móvil (no px-6), centrado con max-w-6xl. */
export const VIDEOS_EDUCATIVOS_MAIN_CLASS =
  "relative z-20 box-border w-full max-w-full px-4 pt-20 pb-20 sm:px-6";

export const VIDEOS_EDUCATIVOS_CONTAINER_CLASS = "mx-auto box-border w-full max-w-6xl";

export const VIDEOS_EDUCATIVOS_BACK_BTN_CLASS =
  "mx-auto w-full max-w-xs sm:mx-0 sm:max-w-none sm:w-auto";

export const VIDEOS_EDUCATIVOS_SECTION_CLASS = "scroll-mt-24 box-border w-full min-w-0";

/**
 * Grid 1 col móvil → 2 tablet → 4 desktop.
 * min-w-0 evita que las tarjetas se peguen al borde derecho.
 */
export const VIDEOS_EDUCATIVOS_GRID_CLASS =
  "grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 box-border w-full min-w-0 [&>*]:min-w-0";

export const VIDEOS_EDUCATIVOS_GRID_CELL_CLASS = "w-full min-w-0";

/** Artículo tarjeta: overflow-hidden + box-border; hover solo sm+. */
export const videosEducativosCardShellClass = (online: boolean) =>
  [
    "group box-border w-full min-w-0 max-w-full overflow-hidden rounded-2xl border bg-card/40 text-left backdrop-blur-xl transition-all duration-500 sm:hover:-translate-y-1",
    online
      ? "border-amber-300/80 shadow-[0_0_55px_-10px_rgba(250,204,21,0.95)] hover:border-yellow-200/90"
      : "border-border/50 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]",
  ].join(" ");
