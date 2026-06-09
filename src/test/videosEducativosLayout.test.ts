import { describe, expect, it } from "vitest";
import {
  VIDEOS_EDUCATIVOS_GRID_CLASS,
  VIDEOS_EDUCATIVOS_MAIN_CLASS,
  VIDEOS_EDUCATIVOS_PAGE_ROOT_CLASS,
} from "@/components/salas/videosEducativosLayout";

/** Evita regresiones del layout móvil (tarjetas pegadas al borde derecho). */
describe("videosEducativosLayout", () => {
  it("main mantiene px-4 en movil sin 100dvw", () => {
    expect(VIDEOS_EDUCATIVOS_MAIN_CLASS).toContain("px-4");
    expect(VIDEOS_EDUCATIVOS_MAIN_CLASS).not.toContain("100dvw");
    expect(VIDEOS_EDUCATIVOS_MAIN_CLASS).not.toContain("w-screen");
  });

  it("grid y pagina evitan desborde horizontal", () => {
    expect(VIDEOS_EDUCATIVOS_PAGE_ROOT_CLASS).toContain("overflow-x-hidden");
    expect(VIDEOS_EDUCATIVOS_GRID_CLASS).toContain("min-w-0");
    expect(VIDEOS_EDUCATIVOS_GRID_CLASS).toContain("[&>*]:min-w-0");
  });
});
