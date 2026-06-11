import { describe, expect, it } from "vitest";
import {
  coliseoCameraGuideChannelName,
  isColiseoGuidePoint,
  pickLatestColiseoGuideFromPresence,
} from "@/lib/coliseoDocenteGuide";

describe("coliseoDocenteGuide", () => {
  it("canal estable por slug", () => {
    expect(coliseoCameraGuideChannelName("Mi-Clase")).toBe("class-camera-guide-mi-clase");
    expect(coliseoCameraGuideChannelName("")).toBe("class-camera-guide-main");
  });

  it("valida puntos de guia 1-3", () => {
    expect(isColiseoGuidePoint(1)).toBe(true);
    expect(isColiseoGuidePoint(4)).toBe(false);
  });

  it("elige el punto mas reciente del docente en presence", () => {
    const picked = pickLatestColiseoGuideFromPresence(
      {
        teacher: [{ userId: "t1", lastGuidePoint: 2, guideAt: 1000 }],
        other: [{ userId: "t2", lastGuidePoint: 3, guideAt: 2000 }],
      },
      "student-1",
    );
    expect(picked).toEqual({ point: 3, guideAt: 2000 });
  });

  it("ignora el propio usuario en presence", () => {
    const picked = pickLatestColiseoGuideFromPresence(
      {
        self: [{ userId: "student-1", lastGuidePoint: 1, guideAt: 9000 }],
        teacher: [{ userId: "t1", lastGuidePoint: 2, guideAt: 1000 }],
      },
      "student-1",
    );
    expect(picked).toEqual({ point: 2, guideAt: 1000 });
  });
});
