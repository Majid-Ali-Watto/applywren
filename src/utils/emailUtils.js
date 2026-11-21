import * as XLSX from "xlsx";
import { isEmail } from "@/lib/validate";
import { normalizeKey } from "@/lib/template";

// A spreadsheet can declare millions of cells in a few bytes, so imports are
// capped before parsing and only the top-left part of a sheet is read.
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 1000;
const MAX_COLUMNS = 50;
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Reads recipients from a JSON, Excel or CSV file as `[{ email, fields }]`.
 * - JSON: an array of email strings, or of objects with an `email` key.
 * - Sheets: if the first row has an "email" column, every column becomes a
 *   personalization field (e.g. "Company" -> {{company}}); otherwise every
 *   cell that looks like an email is imported.
 */
export async function extractEmailsFromFile(file) {
  if (!file) return [];
  if (file.size > MAX_IMPORT_BYTES) throw new Error("That file is too large. Import at most 5 MB at a time.");
  const name = file.name.toLowerCase();

  if (file.type === "application/json" || name.endsWith(".json")) {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error("Invalid JSON file.");
    }
    if (!Array.isArray(data)) throw new Error("JSON must be an array.");
    return dedupe(data.slice(0, MAX_ROWS).map((item) => (typeof item === "string" ? { email: item } : item)));
  }

  if (/\.(xlsx|xls|csv)$/.test(name)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", dense: true, sheetRows: MAX_ROWS + 1 });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet?.["!ref"]) return [];
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    range.e.r = Math.min(range.e.r, range.s.r + MAX_ROWS);
    range.e.c = Math.min(range.e.c, range.s.c + MAX_COLUMNS - 1);
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", range });
    const header = (rows[0] || []).map(normalizeKey);

    if (header.includes("email")) {
      return dedupe(
        rows.slice(1).map((row) => Object.fromEntries(header.map((key, i) => [key, row[i]])))
      );
    }
    return dedupe(
      rows.flat().map((cell) => ({ email: typeof cell === "string" ? cell : "" }))
    );
  }

  throw new Error("Please select a JSON, Excel or CSV file.");
}

function dedupe(items) {
  const byEmail = new Map();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const fields = {};
    for (const [key, value] of Object.entries(item)) {
      const normalized = normalizeKey(key);
      if (normalized && !UNSAFE_KEYS.has(normalized) && value !== "" && value != null) fields[normalized] = String(value).trim();
    }
    const email = fields.email;
    delete fields.email;
    if (isEmail(email) && !byEmail.has(email.toLowerCase())) {
      byEmail.set(email.toLowerCase(), { email, fields });
    }
  }
  return [...byEmail.values()];
}
