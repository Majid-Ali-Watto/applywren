import { expect, test } from "vitest";
import { clientIp } from "@/lib/rateLimit";

const req = (headers) => new Request("http://localhost/", { headers });

test("clientIp trusts X-Real-IP, else the last X-Forwarded-For hop (the one our proxy added)", () => {
  expect(clientIp(req({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.9");
  expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9"); // first entry is client-forged
  expect(clientIp(req({}))).toBe("unknown");
});
