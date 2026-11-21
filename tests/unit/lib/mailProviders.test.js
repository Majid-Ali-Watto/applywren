import { describe, expect, test } from "vitest";
import { isSmtpHostname, providerForEmail, providerForMx } from "@/lib/mailProviders";

describe("providerForEmail", () => {
  test("knows common providers", () => {
    expect(providerForEmail("jane@gmail.com")).toMatchObject({ host: "smtp.gmail.com", port: 465 });
    expect(providerForEmail("Jane@GoogleMail.com").host).toBe("smtp.gmail.com");
    expect(providerForEmail("jane@yahoo.co.uk").host).toBe("smtp.mail.yahoo.com");
    expect(providerForEmail("jane@icloud.com")).toMatchObject({ host: "smtp.mail.me.com", port: 587 });
    expect(providerForEmail("jane@hotmail.com").note).toMatch(/Microsoft/);
  });

  test("returns null for other domains", () => {
    expect(providerForEmail("jane@acme.com")).toBeNull();
  });
});

describe("providerForMx", () => {
  test("recognizes hosted mail by its mail servers", () => {
    expect(providerForMx(["aspmx.l.google.com."]).host).toBe("smtp.gmail.com");
    expect(providerForMx(["acme-com.mail.protection.outlook.com"]).host).toBe("smtp.office365.com");
    expect(providerForMx(["mx.zoho.eu"]).host).toBe("smtp.zoho.eu");
    expect(providerForMx(["in1-smtp.messagingengine.com"]).host).toBe("smtp.fastmail.com");
  });

  test("returns null for self-hosted mail", () => {
    expect(providerForMx(["mail.acme.com"])).toBeNull();
    expect(providerForMx([])).toBeNull();
  });
});

describe("isSmtpHostname", () => {
  test("accepts hostnames only", () => {
    expect(isSmtpHostname("smtp.example.com")).toBe(true);
    for (const bad of ["10.0.0.1", "localhost", "smtp.example.com:465", "http://smtp.x.com", "a..b.com", ""]) {
      expect(isSmtpHostname(bad)).toBe(false);
    }
  });
});
