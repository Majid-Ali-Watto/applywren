import { expect, test } from "vitest";
import * as XLSX from "xlsx";
import { extractEmailsFromFile } from "@/utils/emailUtils";

const xlsxBytes = (rows) => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "Sheet1");
  return XLSX.write(book, { type: "array", bookType: "xlsx" });
};
const xlsxFile = (rows) => new File([xlsxBytes(rows)], "list.xlsx");

/** A tiny real sheet whose header claims a huge size, as a hostile file would. */
function claimsHugeSize(rows) {
  const zip = XLSX.CFB.read(new Uint8Array(xlsxBytes(rows)), { type: "array" });
  const sheet = zip.FileIndex[zip.FullPaths.findIndex((path) => path.endsWith("xl/worksheets/sheet1.xml"))];
  const xml = new TextDecoder().decode(sheet.content).replace(/<dimension ref="[^"]*"/, '<dimension ref="A1:XFD1048576"');
  sheet.content = new TextEncoder().encode(xml);
  return new File([XLSX.CFB.write(zip, { fileType: "zip", type: "array" })], "huge.xlsx");
}

test("imports columns as fields", async () => {
  const rows = await extractEmailsFromFile(xlsxFile([["Email", "Company"], ["ann@acme.test", "Acme"]]));
  expect(rows).toEqual([{ email: "ann@acme.test", fields: { company: "Acme" } }]);
});

test("a sheet that declares millions of cells is read quickly", async () => {
  const start = performance.now();
  const rows = await extractEmailsFromFile(claimsHugeSize([["Email"], ["ann@acme.test"]]));
  expect(rows.map((r) => r.email)).toEqual(["ann@acme.test"]);
  expect(performance.now() - start).toBeLessThan(2000);
});

test("refuses files over 5 MB and ignores built-in object keys", async () => {
  await expect(extractEmailsFromFile(new File([new Uint8Array(6 * 1024 * 1024)], "big.csv"))).rejects.toThrow(/5 MB/);
  const json = new File([JSON.stringify([{ email: "a@b.test", constructor: "x", __proto__x: 1 }])], "l.json", { type: "application/json" });
  const [row] = await extractEmailsFromFile(json);
  expect(Object.hasOwn(row.fields, "constructor")).toBe(false);
});

test("only the first 1,000 rows are read", async () => {
  const data = [["Email"], ...Array.from({ length: 1500 }, (_, i) => [`p${i}@acme.test`])];
  expect(await extractEmailsFromFile(xlsxFile(data))).toHaveLength(1000);
});
