"use client";
import { AlertCircle, Eye, Paperclip } from "lucide-react";
import { safeHtml } from "@/utils/safeHtml";
import { Badge, Card, cx, inputClass } from "../ui";

// Marks [bracketed] blanks in preview HTML (never across tags).
const highlightBlanks = (html) => html.replace(/\[[^\][\n<>]{2,80}\]/g, (m) => `<mark>${m}</mark>`);

/** The email exactly as the selected recipient will receive it. */
export default function EmailPreview({ m, onEditProfile }) {
  const view = m.preview();
  return (
    <Card
      title="Preview"
      icon={Eye}
      bodyClassName="p-0"
      actions={
        m.emails.length > 1 && (
          <select
            value={m.previewTarget}
            onChange={(e) => m.setPreviewEmail(e.target.value)}
            className={cx(inputClass, "h-8 w-44 py-0 text-xs")}
            aria-label="Preview the email sent to"
          >
            {m.emails.map((email) => (
              <option key={email} value={email}>{m.recipientFields(email).company || email}</option>
            ))}
          </select>
        )
      }
    >
      <dl className="space-y-1 border-b border-slate-100 px-5 py-3 text-sm">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-slate-500">From</dt>
          <dd className="min-w-0 truncate">
            {m.sender.my_name} <span className="text-slate-500">&lt;{m.sender.my_email}&gt;</span>{" "}
            {onEditProfile && (
              <button onClick={onEditProfile} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                edit
              </button>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-slate-500">To</dt>
          <dd className="min-w-0 truncate">{view.email || "—"}</dd>
        </div>
        {view.cc.length > 0 && (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-slate-500">CC</dt>
            <dd className="min-w-0 truncate">{view.cc.join(", ")}</dd>
          </div>
        )}
        {view.bcc.length > 0 && (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-slate-500">BCC</dt>
            <dd className="min-w-0 truncate">{view.bcc.join(", ")}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-slate-500">Subject</dt>
          <dd className="min-w-0 font-medium">{view.subject || "—"}</dd>
        </div>
      </dl>
      {view.missing.length > 0 && (
        <p className="flex items-center gap-1.5 bg-amber-50 px-5 py-2 text-xs text-amber-800">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Missing for this person: {view.missing.join(", ")}
        </p>
      )}
      <div className="max-h-[50vh] overflow-auto px-5 py-4">
        {view.hasLetter ? (
          <div className="letter text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: safeHtml(highlightBlanks(view.html)) }} />
        ) : (
          <p className="text-sm text-slate-400">Your letter will appear here, personalized for each person.</p>
        )}
        {view.files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
            {view.files.map((f) => (
              <Badge key={f.id}><Paperclip className="h-3 w-3" /> {f.name}</Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
