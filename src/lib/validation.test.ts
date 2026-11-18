import { describe, expect, it } from "vitest";
import { normalizePhone, registrationSchema } from "./validation";

describe("registrationSchema", () => {
  const valid = {
    fullName: "Amina El Mansouri",
    phone: "+212 600 123 456",
    email: "AMINA@example.com",
    filiere: "GIL",
    academicYear: "2nd Year",
  };

  it("accepts complete valid registration data", () => {
    const result = registrationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing and invalid fields", () => {
    expect(registrationSchema.safeParse({ ...valid, email: "invalid" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...valid, filiere: "" }).success).toBe(false);
  });

  it("normalizes phone numbers consistently", () => {
    expect(normalizePhone("+212 (600) 123-456")).toBe("+212600123456");
  });
});
