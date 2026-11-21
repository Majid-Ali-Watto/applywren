import { describe, expect, test } from "vitest";
import { errorResponse, readJson } from "@/lib/http";

const request = (body, headers = {}) => new Request("http://localhost/api", { method: "POST", body, headers });

describe("readJson", () => {
  test("parses JSON bodies", async () => {
    expect(await readJson(request('{"a":1}'))).toEqual({ a: 1 });
  });

  test("malformed JSON is a 400", async () => {
    const res = errorResponse(await readJson(request("{nope")).catch((e) => e), "test");
    expect(res.status).toBe(400);
  });

  test("bodies over the limit are a 413, whatever Content-Length claims", async () => {
    const big = JSON.stringify({ a: "x".repeat(70 * 1024) });
    expect(errorResponse(await readJson(request(big)).catch((e) => e), "test").status).toBe(413);
    expect(errorResponse(await readJson(request(big, { "content-length": "10" })).catch((e) => e), "test").status).toBe(413);
    expect(await readJson(request(big), { maxBytes: 100 * 1024 })).toEqual({ a: "x".repeat(70 * 1024) });
  });
});
