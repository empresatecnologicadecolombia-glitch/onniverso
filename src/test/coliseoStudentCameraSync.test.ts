import { describe, expect, it } from "vitest";
import {
  buildColiseoStudentCameraSyncChannel,
  COLISEO_STUDENT_CAMERA_SYNC_EVENT,
} from "@/lib/coliseoStudentCameraSync";

describe("coliseoStudentCameraSync", () => {
  it("canal separado de voz y video MP4", () => {
    expect(buildColiseoStudentCameraSyncChannel("mi-clase")).toBe("class-student-camera-mi-clase");
    expect(buildColiseoStudentCameraSyncChannel("")).toBe("class-student-camera-main");
  });

  it("evento broadcast estable", () => {
    expect(COLISEO_STUDENT_CAMERA_SYNC_EVENT).toBe("student-camera-control");
  });
});
