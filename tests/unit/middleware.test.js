import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { middleware } from "@/middleware";
import { signToken } from "@/lib/auth";

process.env.JWT_SECRET = "mw-0f3c9a7e5b1d4c2a8e6f0b3d5a7c9e1f";
const key = new TextEncoder().encode(process.env.JWT_SECRET);

const request = (path, { method = "GET", headers = {}, token } = {}) =>
  new NextRequest(new URL(path, "http://localhost"), {
    method,
    headers: { ...(token && { cookie: `session=${token}` }), ...headers },
  });
const user = { _id: "64b000000000000000000001", email: "jane@example.com", sessionVersion: 3 };

describe("middleware", () => {
  test("public routes pass without a session", async () => {
    const res = await middleware(request("/api/login", { method: "POST", headers: { "sec-fetch-site": "same-origin" } }));
    expect(res.status).toBe(200);
  });

  test("protected routes need a session cookie; headers or bearer tokens aren't enough", async () => {
    const token = await signToken(user);
    expect((await middleware(request("/api/documents"))).status).toBe(401);
    expect((await middleware(request("/api/documents", { headers: { "x-user-id": user._id } }))).status).toBe(401);
    expect((await middleware(request("/api/documents", { headers: { authorization: `Bearer ${token}` } }))).status).toBe(401);
  });

  test("rejects unsigned, wrongly signed, expired and foreign tokens", async () => {
    const claims = { sv: 0 };
    const payload = Buffer.from(JSON.stringify({ sub: user._id, sv: 0, exp: 9999999999 })).toString("base64url");
    const unsigned = `eyJhbGciOiJIUzI1NiJ9.${payload}.AAAA`;
    const none = `eyJhbGciOiJub25lIn0.${payload}.`;
    const sign = (jwt, secret = key) => jwt.setProtectedHeader({ alg: "HS256" }).setSubject(user._id).sign(secret);
    const wrongKey = await sign(new SignJWT(claims).setIssuer("applywren").setAudience("applywren-session").setExpirationTime("1h"), new TextEncoder().encode("x".repeat(40)));
    const expired = await sign(new SignJWT(claims).setIssuer("applywren").setAudience("applywren-session").setExpirationTime(Math.floor(Date.now() / 1000) - 60));
    const otherAudience = await sign(new SignJWT(claims).setIssuer("applywren").setAudience("something-else").setExpirationTime("1h"));

    for (const token of [unsigned, none, wrongKey, expired, otherAudience]) {
      expect((await middleware(request("/api/documents", { token }))).status).toBe(401);
    }
  });

  test("a valid session passes", async () => {
    const res = await middleware(request("/api/documents", { token: await signToken(user) }));
    expect(res.status).toBe(200);
  });

  test("blocks cross-site requests that change data, even with a valid session", async () => {
    const token = await signToken(user);
    const cases = [
      { "sec-fetch-site": "cross-site" },
      { "sec-fetch-site": "same-site" },
      { origin: "https://evil.example", host: "localhost" },
      {}, // no Origin and no Sec-Fetch-Site
    ];
    for (const headers of cases) {
      expect((await middleware(request("/api/sendEmails", { method: "POST", token, headers }))).status).toBe(403);
      expect((await middleware(request("/api/login", { method: "POST", headers }))).status).toBe(403);
    }
    const sameOrigin = { origin: "http://localhost:3000", host: "localhost:3000" };
    expect((await middleware(request("/api/sendEmails", { method: "POST", token, headers: sameOrigin }))).status).toBe(200);
    // Reading is fine from anywhere (the cookie is SameSite=Lax and responses aren't shared cross-origin).
    expect((await middleware(request("/api/documents", { token, headers: { "sec-fetch-site": "cross-site" } }))).status).toBe(200);
  });

  test("refuses to run with a short JWT_SECRET", async () => {
    const secret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "too-short";
    try {
      expect(() => signToken(user)).toThrow(/32/);
    } finally {
      process.env.JWT_SECRET = secret;
    }
  });
});

test("placeholder or short secrets are refused", async () => {
  const { requireSecret } = await import("@/lib/auth");
  for (const value of [undefined, "short", "change-me-to-a-long-random-string-please", "my-example-value-that-is-long-enough-x"]) {
    process.env.TEST_SECRET = value ?? "";
    expect(() => requireSecret("TEST_SECRET"), String(value)).toThrow();
  }
  process.env.TEST_SECRET = "0f3c9a7e5b1d4c2a8e6f0b3d5a7c9e1f";
  expect(requireSecret("TEST_SECRET")).toBe("0f3c9a7e5b1d4c2a8e6f0b3d5a7c9e1f");
});

test("pages get a fresh script nonce in their Content-Security-Policy", async () => {
  const first = await middleware(new NextRequest(new URL("/privacy", "http://localhost")));
  const second = await middleware(new NextRequest(new URL("/privacy", "http://localhost")));
  const policy = first.headers.get("content-security-policy");
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce).toMatch(/^[A-Za-z0-9+/=]{20,}$/);
  expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(policy).toMatch(/frame-ancestors 'none'/);
  expect(second.headers.get("content-security-policy")).not.toContain(nonce);
  expect(first.headers.get("x-middleware-request-x-nonce")).toBe(nonce); // handed to the page render
});
