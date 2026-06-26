import { describe, expect, it, beforeEach } from "vitest";
import {
  clearStoredProfileName,
  readStoredProfileName,
  resolveProfileDisplayName,
  writeStoredProfileName,
} from "@/lib/profileNameStorage";

describe("profileNameStorage", () => {
  const userA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const userB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  beforeEach(() => {
    localStorage.clear();
  });

  it("stores names per user id", () => {
    writeStoredProfileName(userA, "Deivy");
    writeStoredProfileName(userB, "Otro");

    expect(readStoredProfileName(userA)).toBe("Deivy");
    expect(readStoredProfileName(userB)).toBe("Otro");
  });

  it("migrates legacy global key once for the active user", () => {
    localStorage.setItem("onniverso.profile.name", "Legacy");
    expect(readStoredProfileName(userA)).toBe("Legacy");
    expect(localStorage.getItem("onniverso.profile.name")).toBeNull();
    expect(readStoredProfileName(userB)).toBeUndefined();
  });

  it("prefers database name over device cache", () => {
    writeStoredProfileName(userA, "Cache");
    const resolved = resolveProfileDisplayName({
      profileFullName: "Desde BD",
      userId: userA,
      email: "deivys1224@gmail.com",
    });
    expect(resolved).toBe("Desde BD");
  });

  it("uses device cache before metadata and email", () => {
    writeStoredProfileName(userA, "Mi nombre");
    const resolved = resolveProfileDisplayName({
      profileFullName: null,
      userId: userA,
      metadataFullName: "xvmrih",
      email: "deivys1224@gmail.com",
    });
    expect(resolved).toBe("Mi nombre");
  });

  it("clears scoped storage on logout helper", () => {
    writeStoredProfileName(userA, "Deivy");
    clearStoredProfileName(userA);
    expect(readStoredProfileName(userA)).toBeUndefined();
  });
});
