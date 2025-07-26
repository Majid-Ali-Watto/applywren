"use client";
import React from "react";
import { extractEmailsFromFile } from "../utils/emailUtils";

export default function EmailImport({ onEmailsImported }) {
  async function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const emailsArr = await extractEmailsFromFile(file);
      onEmailsImported(emailsArr);
    } catch (err) {
      alert(err.message);
    }
  }
  return (
    <div>
      <label className="block font-medium mb-1">
        Import Emails (JSON or Excel)
      </label>
      <input
        type="file"
        accept=".json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleFileImport}
        className="w-full border border-gray-300 rounded p-2 mb-2"
      />
    </div>
  );
}
