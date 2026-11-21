import { test } from "vitest";
import assert from "node:assert/strict";
import { groupByCompany } from "@/lib/applications";

test("groups recipients by company and role, case-insensitively", () => {
  const groups = groupByCompany([
    { email: "a@acme.com", fields: { company: "Acme", role: "Frontend" } },
    { email: "b@acme.com", fields: { company: "acme ", role: "frontend" } },
    { email: "c@acme.com", fields: { company: "Acme", role: "Backend" } },
    { email: "d@globex.com", fields: { company: "Globex" } },
  ]);
  assert.deepEqual(
    groups.map((g) => [g.company, g.role, g.recipients.map((r) => r.email)]),
    [
      ["Acme", "Frontend", ["a@acme.com", "b@acme.com"]],
      ["Acme", "Backend", ["c@acme.com"]],
      ["Globex", "", ["d@globex.com"]],
    ]
  );
});

test("falls back to the email domain when no company is given", () => {
  const groups = groupByCompany([
    { email: "hr@Initech.com", fields: {} },
    { email: "jobs@initech.com" },
  ]);
  assert.deepEqual(groups.map((g) => [g.company, g.recipients.length]), [["initech.com", 2]]);
});

test("recipients with different letters at the same company and role are split", () => {
  const groups = groupByCompany([
    { email: "a@acme.com", fields: { company: "Acme", role: "Dev" }, message: 0 },
    { email: "b@acme.com", fields: { company: "Acme", role: "Dev" }, message: 1 },
  ]);
  assert.equal(groups.length, 2);
});
