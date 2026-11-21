import { afterEach, describe, expect, test } from "vitest";
import { decryptSecret, encryptSecret, isPublicAddress } from "@/lib/mailbox";

describe("app password encryption", () => {
  afterEach(() => {
    delete process.env.MAILBOX_SECRET;
  });

  test("round-trips, with a fresh IV each time", () => {
    process.env.MAILBOX_SECRET = "unit-mbx-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d";
    const a = encryptSecret("abcd efgh ijkl mnop");
    expect(a).not.toContain("abcd");
    expect(encryptSecret("abcd efgh ijkl mnop")).not.toBe(a);
    expect(decryptSecret(a)).toBe("abcd efgh ijkl mnop");
  });

  test("fails with a different secret or tampered data", () => {
    process.env.MAILBOX_SECRET = "unit-mbx-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d";
    const stored = encryptSecret("secret");
    const tampered = stored.slice(0, -2) + (stored.endsWith("A=") ? "B=" : "A=");
    expect(() => decryptSecret(tampered)).toThrow();
    process.env.MAILBOX_SECRET = "other-mbx-9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c";
    expect(() => decryptSecret(stored)).toThrow();
  });

  test("requires MAILBOX_SECRET", () => {
    expect(() => encryptSecret("x")).toThrow(/MAILBOX_SECRET/);
  });
});

describe("isPublicAddress", () => {
  test("rejects internal addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  test("accepts internet addresses", () => {
    for (const ip of ["142.250.102.108", "2607:f8b0:4023:c0b::6c", "::ffff:8.8.8.8"]) {
      expect(isPublicAddress(ip), ip).toBe(true);
    }
  });
});
