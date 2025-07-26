import * as XLSX from "xlsx";

export async function extractEmailsFromFile(file) {
  if (!file) return [];

  if (file.type === "application/json" || file.name.endsWith(".json")) {
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        if (typeof data[0] === "string") return data;
        if (typeof data[0] === "object" && data[0].email) return data.map((item) => item.email);
      }
    } catch {
      throw new Error("Invalid JSON file.");
    }
  } else if (
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  ) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    return rows
      .flat()
      .filter(
        (cell) =>
          typeof cell === "string" &&
          /^[\w\-.]+@[\w\-.]+\.\w{2,}$/.test(cell.trim())
      );
  }
  throw new Error("Please select a valid JSON or Excel file.");
}