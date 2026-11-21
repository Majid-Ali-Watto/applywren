"use client";
import { useEffect, useState } from "react";
import { Briefcase, CheckCircle2, ChevronDown, FileText, Search, SquarePen, XCircle } from "lucide-react";
import { apiFetch } from "@/utils/api";
import { formatDate, timeAgo } from "@/utils/appliedTime";
import { safeHtml } from "@/utils/safeHtml";
import { renderTemplate } from "@/lib/template";
import { APPLICATION_STATUSES } from "@/models/applicationStatuses";
import StatusDropdown from "./StatusDropdown";
import PdfPreview from "./PdfPreview";
import { useToast } from "./Toast";
import { Avatar, Button, EmptyState, Input, PageLoader, STATUS_STYLES, Spinner, cx } from "./ui";

// Older records stored emails in mainEmails and file contents inline.
const recipientsOf = (app) =>
  app.recipients?.length ? app.recipients : (app.mainEmails || []).map((email) => ({ email, status: "sent" }));

// Subject and letter are stored as templates; show them as sent to the first
// recipient (recipients of one application share company and role).
const asSent = (app, text, options) => {
  const first = recipientsOf(app)[0];
  return first ? renderTemplate(text, { ...first.fields, email: first.email }, options) : text;
};

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export default function Applications({ onCompose }) {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    apiFetch("/api/applications")
      .then(setApplications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    const previous = applications;
    setApplications((apps) => apps.map((a) => (a._id === id ? { ...a, status } : a)));
    try {
      await apiFetch(`/api/applications/${id}`, { method: "PUT", body: { status } });
      toast(`Marked as ${STATUS_STYLES[status].label.toLowerCase()}`);
    } catch (err) {
      setApplications(previous);
      toast(`Could not update status: ${err.message}`, "error");
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <EmptyState icon={XCircle} title="Could not load applications" text={error} />;
  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white">
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          text="Applications you send appear here, one per company, so you can track each one."
          action={<Button onClick={onCompose}><SquarePen className="h-4 w-4" /> Compose your first</Button>}
        />
      </div>
    );
  }

  const needle = query.trim().toLowerCase();
  const visible = applications.filter(
    (app) =>
      (!statusFilter || app.status === statusFilter) &&
      (!needle ||
        [app.company, app.role, asSent(app, app.subject), ...recipientsOf(app).map((r) => r.email)]
          .filter(Boolean)
          .some((text) => text.toLowerCase().includes(needle)))
  );
  const count = (status) => applications.filter((a) => a.status === status).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[["", "All", null, applications.length], ...APPLICATION_STATUSES.map((s) => [s, STATUS_STYLES[s].label, STATUS_STYLES[s].dot, count(s)])].map(
          ([value, label, dot, n]) => (
            <button
              key={label}
              onClick={() => setStatusFilter(value)}
              aria-pressed={statusFilter === value}
              className={cx(
                "rounded-xl border bg-white p-4 text-left shadow-sm transition",
                statusFilter === value ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 hover:border-slate-300",
                value === "" && "col-span-2 sm:col-span-1"
              )}
            >
              <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                {dot && <span className={cx("h-2 w-2 rounded-full", dot)} />}
                {label}
              </span>
              <span className="mt-1 block text-2xl font-semibold text-slate-900">{n}</span>
            </button>
          )
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by company, role, subject or email"
          aria-label="Search applications"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {visible.length === 0 ? (
          <EmptyState icon={Search} title="No matches" text="Try a different search or status filter." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((app) => (
              <ApplicationRow
                key={app._id}
                app={app}
                expanded={expandedId === app._id}
                onToggle={() => setExpandedId(expandedId === app._id ? null : app._id)}
                onStatus={(status) => updateStatus(app._id, status)}
                onPreview={setPreviewFile}
              />
            ))}
          </ul>
        )}
      </div>

      <PdfPreview file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

function ApplicationRow({ app, expanded, onToggle, onStatus, onPreview }) {
  const recipients = recipientsOf(app);
  const subject = asSent(app, app.subject);
  const title = app.company || subject;
  const failed = recipients.filter((r) => r.status === "failed").length;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), onToggle())}
        className="flex cursor-pointer items-center gap-4 px-4 py-3.5 hover:bg-slate-50 sm:px-5"
      >
        <span className="hidden sm:block">
          <Avatar name={title} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">
            {title}
            {app.role && <span className="hidden font-normal text-slate-500 sm:inline"> · {app.role}</span>}
          </p>
          <p className="truncate text-sm text-slate-500">
            {app.role && <span className="sm:hidden">{app.role} · </span>}
            {app.company && <span className="hidden sm:inline">{subject} · </span>}
            {plural(recipients.length, "contact")}
            {failed > 0 && <span className="text-red-600"> · {failed} failed</span>}
            {" · "}
            <span title={formatDate(app.appliedAt)}>{timeAgo(app.appliedAt)}</span>
          </p>
        </div>
        <StatusDropdown value={app.status} onChange={(e) => onStatus(e.target.value)} />
        <ChevronDown className={cx("hidden h-4 w-4 shrink-0 text-slate-400 transition sm:block", expanded && "rotate-180")} />
      </div>

      {expanded && (
        <div className="grid gap-6 border-t border-slate-100 bg-slate-50/60 px-4 py-5 sm:px-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Sent to</h3>
              <ul className="space-y-1.5">
                {recipients.map((r) => (
                  <li key={r.email} className="flex items-start gap-2 text-sm">
                    {r.status === "failed" ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                    <span className="min-w-0">
                      <span className="break-all text-slate-800">{r.email}</span>
                      {r.fields?.name && <span className="text-slate-500"> · {r.fields.name}</span>}
                      {r.error && <span className="block text-xs text-red-600">{r.error}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {app.ccEmails?.length > 0 && <p className="mt-2 text-xs text-slate-500">CC: {app.ccEmails.join(", ")}</p>}
              {app.bccEmails?.length > 0 && <p className="text-xs text-slate-500">BCC: {app.bccEmails.join(", ")}</p>}
            </section>
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Attachments</h3>
              <ApplicationFiles app={app} onPreview={onPreview} />
            </section>
            <p className="text-xs text-slate-500">Sent {formatDate(app.appliedAt)}</p>
          </div>
          <section className="min-w-0">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Cover letter</h3>
            <div
              className="letter max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800"
              dangerouslySetInnerHTML={{ __html: safeHtml(asSent(app, app.coverLetter, { html: true })) }}
            />
          </section>
        </div>
      )}
    </li>
  );
}

function ApplicationFiles({ app, onPreview }) {
  const [files, setFiles] = useState(app.resumes?.length ? app.resumes : null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (files || !app.resumeIds?.length) return;
    Promise.all(app.resumeIds.map((id) => apiFetch(`/api/documents/${id}`)))
      .then((docs) => setFiles(docs.map((d) => ({ name: d.name, base64: d.content }))))
      .catch((err) => setError(err.message));
  }, [app, files]);

  if (error) return <p className="text-sm text-red-600">Could not load files: {error}</p>;
  if (!files) return app.resumeIds?.length ? <Spinner className="h-4 w-4" /> : <p className="text-sm text-slate-500">None</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file, i) => (
        <button
          key={`${file.name}-${i}`}
          onClick={() => onPreview(file)}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
        >
          <FileText className="h-4 w-4 text-red-500" /> {file.name || `File ${i + 1}`}
        </button>
      ))}
    </div>
  );
}
