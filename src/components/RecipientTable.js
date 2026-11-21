"use client";
import { X } from "lucide-react";
import { cx } from "./ui";

/**
 * Editable personalization grid: one row per recipient, one column per field.
 * Empty cells show the automatic guess (gray placeholder) when there is one;
 * required-but-missing cells are highlighted.
 */
export default function RecipientTable({ emails, columns, valuesFor, guessesFor, missingFor, roleOptions, onEdit, onRemove }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Email</th>
            {columns.map((key) => (
              <th key={key} className="whitespace-nowrap px-2 py-2 font-medium">
                {key.replace(/_/g, " ")}
              </th>
            ))}
            <th className="w-8" aria-label="Remove" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {emails.map((email) => {
            const values = valuesFor(email);
            const guesses = guessesFor(email);
            const missing = missingFor(email);
            return (
              <tr key={email} className="align-middle">
                <td className="max-w-[14rem] truncate whitespace-nowrap px-3 py-1.5 text-slate-700" title={email}>
                  {email}
                </td>
                {columns.map((key) => (
                  <td key={key} className="px-1 py-1">
                    <input
                      value={values[key] ?? ""}
                      onChange={(e) => onEdit(email, key, e.target.value)}
                      placeholder={guesses[key] ?? (missing.has(key) ? "required" : "")}
                      list={key === "role" ? "role-options" : undefined}
                      aria-label={`${key} for ${email}`}
                      className={cx(
                        "w-full rounded-md border bg-transparent px-2 py-1 text-sm outline-none",
                        key === "role" ? "min-w-[11rem]" : "min-w-[8rem]",
                        "focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20",
                        missing.has(key)
                          ? "border-amber-300 bg-amber-50 placeholder:text-amber-600"
                          : "border-transparent placeholder:italic placeholder:text-slate-400 hover:border-slate-200"
                      )}
                    />
                  </td>
                ))}
                <td className="pr-2">
                  <button
                    onClick={() => onRemove(email)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <datalist id="role-options">
        {roleOptions.map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>
    </div>
  );
}
