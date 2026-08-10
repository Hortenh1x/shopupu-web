import { describe, expect, it } from "vitest";
import { shippingSchema } from "@/features/shipping/ShippingPage";

const valid = {
  fullName: "Ida Buyer",
  line1: "Sample Street 1",
  city: "Berlin",
  state: "Berlin",
  postalCode: "10115",
  country: "Germany",
  method: "STANDARD_POST" as const
};

describe("checkout shipping form validation", () => {
  it("accepts a complete address; line2 stays optional", () => {
    expect(shippingSchema.safeParse(valid).success).toBe(true);
    expect(shippingSchema.safeParse({ ...valid, line2: "Apt 4" }).success).toBe(true);
  });

  it("rejects too-short required fields and reports the offending paths", () => {
    const result = shippingSchema.safeParse({ ...valid, fullName: "I", city: "B" });
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
    expect(paths).toContain("fullName");
    expect(paths).toContain("city");
  });

  it("rejects an overlong postal code", () => {
    const result = shippingSchema.safeParse({ ...valid, postalCode: "1".repeat(17) });
    expect(result.success).toBe(false);
  });

  it("only allows the shipping methods the backend knows", () => {
    expect(shippingSchema.safeParse({ ...valid, method: "DHL" }).success).toBe(true);
    expect(shippingSchema.safeParse({ ...valid, method: "DRONE" }).success).toBe(false);
  });

  it("rejects a missing method instead of defaulting silently", () => {
    const { method: _method, ...withoutMethod } = valid;
    expect(shippingSchema.safeParse(withoutMethod).success).toBe(false);
  });
});
