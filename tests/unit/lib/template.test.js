import { test } from "vitest";
import assert from "node:assert/strict";
import { blanksIn, missingFields, normalizeKey, placeholdersIn, renderTemplate } from "@/lib/template";

test("normalizeKey maps spreadsheet headers to placeholder keys", () => {
  assert.equal(normalizeKey(" Company Name "), "company_name");
  assert.equal(normalizeKey("E-mail"), "email");
});

test("placeholdersIn finds unique, normalized keys", () => {
  assert.deepEqual(placeholdersIn("Hi {{ Name }}, {{name}} at {{Company Name}}"), ["name", "company_name"]);
});

test("renderTemplate escapes values in HTML and flattens newlines in text", () => {
  const fields = { name: "<b>Ann</b>", company: "A\r\nB" };
  assert.equal(renderTemplate("<p>{{name}}</p>", fields, { html: true }), "<p>&lt;b&gt;Ann&lt;/b&gt;</p>");
  assert.equal(renderTemplate("Role at {{company}}", fields), "Role at A B");
});

test("missingFields reports placeholders with blank or absent values", () => {
  assert.deepEqual(missingFields(["{{name}} {{role}}", "{{company}}"], { name: "Ann", role: " " }), [
    "role",
    "company",
  ]);
});

test("placeholders with a fallback are optional and use it when empty", () => {
  const text = "Dear {{ name | Hiring Manager }}, re {{role}}";
  assert.deepEqual(placeholdersIn(text), ["role"]);
  assert.deepEqual(missingFields([text], { role: "Dev" }), []);
  assert.equal(renderTemplate(text, { role: "Dev" }), "Dear Hiring Manager, re Dev");
  assert.equal(renderTemplate(text, { name: "Ann", role: "Dev" }), "Dear Ann, re Dev");
});

test("blanksIn finds unreplaced [bracketed] template text", () => {
  assert.deepEqual(blanksIn("I have [X years] of [your key skill] experience. [X years]"), [
    "[X years]",
    "[your key skill]",
  ]);
  assert.deepEqual(blanksIn("No blanks [] or [x] here"), []);
});

test("renderTemplate with only: true fills known keys and keeps the rest", () => {
  const text = "{{my_name}} to {{name|team}} at {{company}}";
  assert.equal(renderTemplate(text, { my_name: "Sam" }, { only: true }), "Sam to {{name|team}} at {{company}}");
});

test("matching stays fast on hostile input (no catastrophic backtracking)", () => {
  const N = 200_000;
  for (const text of ["{{" + " ".repeat(N) + "a", "{{a|" + " ".repeat(N), "{{a ".repeat(N / 4), "{{" + "a ".repeat(N / 2)]) {
    const start = performance.now();
    renderTemplate(text, { a: "1" }, { html: true });
    placeholdersIn(text);
    assert.ok(performance.now() - start < 500, `took ${performance.now() - start} ms`);
  }
});

test("built-in object keys are never treated as field values", () => {
  assert.deepEqual(missingFields(["{{constructor}} {{toString}}"], {}), ["constructor", "tostring"]);
  assert.equal(renderTemplate("[{{constructor}}][{{__proto__|x}}]", {}), "[][x]");
});
