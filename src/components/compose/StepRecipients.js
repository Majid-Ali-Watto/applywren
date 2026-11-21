"use client";
import { useState } from "react";
import { ClipboardPaste, Download, FileSpreadsheet, Plus } from "lucide-react";
import { downloadText } from "@/utils/files";
import RecipientTable from "../RecipientTable";
import { Button, Card, inputClass, cx } from "../ui";
import { plural } from "./useCompose";

const SAMPLE_CSV = "Email,Name,Company,Role\nhr@example.com,Jane Doe,Example Corp,Frontend Developer\n";
const SHEET_TYPES =
  ".csv,.xlsx,.xls,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

function ImportButton({ m, variant = "secondary", children }) {
  return (
    <label
      className={cx(
        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition",
        variant === "primary"
          ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
          : "bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
      )}
    >
      <FileSpreadsheet className="h-4 w-4" /> {children}
      <input
        type="file"
        accept={SHEET_TYPES}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) m.importFile(file);
        }}
      />
    </label>
  );
}

export default function StepRecipients({ m }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (m.addEmails(draft) >= 0) setDraft("");
  };

  if (!m.emails.length) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="flex h-full flex-col items-start">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-slate-900">Import a spreadsheet</h2>
            <p className="mt-1 text-sm text-slate-500">
              A CSV or Excel file with an <b>Email</b> column. Name, Company and Role columns are used to personalize
              each email.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ImportButton m={m} variant="primary">Choose file</ImportButton>
              <button
                onClick={() => downloadText("recipients-template.csv", SAMPLE_CSV)}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
              >
                <Download className="h-4 w-4" /> Example file
              </button>
            </div>
          </div>
        </Card>
        <Card>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <ClipboardPaste className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-semibold text-slate-900">Paste email addresses</h2>
          <p className="mt-1 text-sm text-slate-500">One per line, or separated by commas. We&apos;ll guess names and companies.</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder={"jane.doe@company.com\nhr@another.com"}
            className={cx(inputClass, "mt-4 resize-y")}
            aria-label="Email addresses"
          />
          <Button className="mt-3" onClick={add} disabled={!draft.trim()}>
            <Plus className="h-4 w-4" /> Add recipients
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <Card
      title={`${plural(m.emails.length, "recipient")} at ${plural(m.companies.length, "company", "companies")}`}
      description="Check the details below. Gray text was guessed from the email address. Click any cell to change it."
      actions={<ImportButton m={m}>Import more</ImportButton>}
    >
      <div className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add more: paste or type email addresses"
            className={inputClass}
            aria-label="Add email addresses"
          />
          <Button type="submit" variant="secondary" disabled={!draft.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>
        <RecipientTable
          emails={m.emails}
          columns={m.columns}
          valuesFor={m.storedFor}
          guessesFor={(email) => m.recipientFields(email)}
          missingFor={m.incompleteFor}
          roleOptions={m.roles.map((r) => r.label)}
          onEdit={m.editField}
          onRemove={m.removeEmail}
        />
      </div>
    </Card>
  );
}
