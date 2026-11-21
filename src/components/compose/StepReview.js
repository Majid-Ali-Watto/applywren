"use client";
import { useState } from "react";
import { AlertTriangle, Paperclip, UserPlus } from "lucide-react";
import RecipientInput from "../RecipientInput";
import EmailPreview from "./EmailPreview";
import { Avatar, Button, Card, Field, cx } from "../ui";
import { plural } from "./useCompose";

// Also used in element ids, so keep it to letters, digits and dashes.
const groupKey = (group) => `${group.company}-${group.role}-${group.letterLabel}`.replace(/[^a-z0-9]+/gi, "-");

export default function StepReview({ m, onEditProfile }) {
  const [editingCopies, setEditingCopies] = useState(null); // groupKey being edited

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        {m.issues.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <AlertTriangle className="h-4 w-4" /> A few things to fix before sending
            </p>
            <ul className="mt-2 space-y-1.5">
              {m.issues.map((issue) => (
                <li key={issue.text} className="flex items-center justify-between gap-3 text-sm text-amber-900">
                  <span>{issue.text}</span>
                  {issue.fix === "profile" ? (
                    <Button size="sm" variant="secondary" onClick={onEditProfile}>
                      Connect
                    </Button>
                  ) : (
                    issue.step !== 3 && (
                      <Button size="sm" variant="secondary" onClick={() => m.setStep(issue.step)}>
                        Fix
                      </Button>
                    )
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Card
          title={`${plural(m.emails.length, "email")} to ${plural(m.companies.length, "company", "companies")}`}
          description="Each person gets their own email. Click one to preview it."
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-slate-100">
            {m.companies.map((group) => {
              const key = groupKey(group);
              const selected = group.recipients.some((r) => r.email === m.previewTarget);
              const copies = [...group.cc.map((e) => `CC ${e}`), ...group.bcc.map((e) => `BCC ${e}`)];
              return (
                <li key={key} className={cx(selected && "bg-indigo-50/60")}>
                  <div className="flex items-center gap-3 px-5 py-3">
                    <button
                      onClick={() => m.setPreviewEmail(group.recipients[0].email)}
                      aria-pressed={selected}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar name={group.company} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {group.company}
                          {group.role && <span className="font-normal text-slate-500"> · {group.role}</span>}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {group.recipients.map((r) => r.email).join(", ")}
                        </span>
                        {copies.length > 0 && <span className="block truncate text-xs text-indigo-700">{copies.join(" · ")}</span>}
                      </span>
                      <span className="hidden shrink-0 text-right text-xs text-slate-500 sm:block">
                        <span className="block">{group.letterLabel}</span>
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3" /> {group.files.map((f) => f.name).join(", ") || "no files"}
                        </span>
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCopies(editingCopies === key ? null : key)}
                      aria-expanded={editingCopies === key}
                      title={`CC or BCC someone on the email to ${group.company}`}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">CC/BCC</span>
                    </Button>
                  </div>
                  {editingCopies === key && (
                    <div className="grid gap-4 border-t border-slate-100 bg-white px-5 py-4 sm:grid-cols-2">
                      <Field label={`CC for ${group.company}`} htmlFor={`cc-${key}`} hint="Copied openly, e.g. the hiring manager or your referrer.">
                        <RecipientInput
                          id={`cc-${key}`}
                          emails={group.cc}
                          onChange={(cc) => m.setCompanyCopies(group, { cc })}
                          placeholder="Optional"
                        />
                      </Field>
                      <Field label={`BCC for ${group.company}`} htmlFor={`bcc-${key}`} hint="Hidden copy for this company only.">
                        <RecipientInput
                          id={`bcc-${key}`}
                          emails={group.bcc}
                          onChange={(bcc) => m.setCompanyCopies(group, { bcc })}
                          placeholder="Optional"
                        />
                      </Field>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="checkbox"
            checked={m.copyMe}
            onChange={(e) => m.setCopyMe(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-indigo-600"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Send me a copy of every email</span>
            <span className="block text-xs text-slate-500">
              A hidden copy (BCC) goes to {m.sender.my_email}, so you have each email in your own inbox.
            </span>
          </span>
        </label>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <EmailPreview m={m} onEditProfile={onEditProfile} />
      </aside>
    </div>
  );
}
