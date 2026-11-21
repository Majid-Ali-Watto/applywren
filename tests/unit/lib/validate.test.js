import { test } from "vitest";
import assert from "node:assert/strict";
import { isEmail, normalizeEmail, passwordProblem } from "@/lib/validate";

test("isEmail accepts ordinary addresses", () => {
  assert.ok(isEmail("jane.doe+jobs@example.co.uk"));
});

test("isEmail rejects header-injection and multi-address input", () => {
  for (const bad of ["a@b.com\r\nBcc: x@y.com", "a@b.com, c@d.com", "Name <a@b.com>", "a@b", "", null]) {
    assert.equal(isEmail(bad), false, String(bad));
  }
});

test("normalizeEmail trims and lower-cases", () => {
  assert.equal(normalizeEmail("  Jane.Doe@Example.COM "), "jane.doe@example.com");
  assert.equal(normalizeEmail(undefined), "");
});

test("passwordProblem allows decent passwords and explains bad ones", () => {
  assert.equal(passwordProblem("correct horse battery", "jane@example.com"), "");
  assert.match(passwordProblem("short"), /8 characters/);
  assert.match(passwordProblem("Password123"), /common/);
  assert.match(passwordProblem("zzzzzzzzzz"), /common/);
  assert.match(passwordProblem("my-jonathan-pass", "Jonathan@example.com"), /email/);
  assert.match(passwordProblem("é".repeat(40)), /72/); // 80 bytes: bcrypt would ignore the end
  assert.match(passwordProblem(undefined), /8 characters/);
});
