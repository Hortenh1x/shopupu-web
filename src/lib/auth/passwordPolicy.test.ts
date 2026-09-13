import { describe, expect, it } from "vitest";
import { newPasswordError } from "@/lib/auth/passwordPolicy";

describe("new password bounds", () => {
  it("allows phrases without composition rules and enforces UTF-8 bytes", () => {
    expect(newPasswordError("a quiet meadow beneath the stars")).toBeNull();
    expect(newPasswordError("old-password")).toContain("15");
    expect(newPasswordError("я".repeat(36))).toBeNull();
    expect(newPasswordError("я".repeat(37))).toContain("72");
  });
});
