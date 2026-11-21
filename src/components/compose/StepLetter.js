"use client";
import { useRef, useState } from "react";
import { Check, Eye, FileText, Layers, LayoutTemplate, Mail, Paperclip, PenLine, Sparkles } from "lucide-react";
import { formatDate } from "@/utils/appliedTime";
import { STARTER_TEMPLATES } from "@/lib/starterTemplates";
import QuillEditor from "../QuillEditor";
import Dropzone from "../Dropzone";
import PdfPreview from "../PdfPreview";
import EmailPreview from "./EmailPreview";
import { Button, Card, Field, Input, Modal, cx, inputClass } from "../ui";
import { DEFAULT, plural } from "./useCompose";

const SENDER_LABELS = { my_name: "Your name", my_email: "Your email", my_phone: "Your phone", my_link: "Your LinkedIn / website" };
const RECIPIENT_LABELS = { name: "Their name", company: "Company", role: "Role", email: "Their email" };
const labelFor = (key) => RECIPIENT_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export default function StepLetter({ m, onEditProfile }) {
  const [previewFile, setPreviewFile] = useState(null);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        {m.roles.length > 1 && <RoleTailoring m={m} />}
        <LetterCard m={m} />
        <ResumeCard m={m} onPreview={setPreviewFile} />
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <EmailPreview m={m} onEditProfile={onEditProfile} />
      </aside>
      <PdfPreview file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

function RoleTailoring({ m }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Layers className="h-4 w-4" />
          </span>
          <p className="text-sm text-slate-700">
            You&apos;re applying for <b>{plural(m.roles.length, "different role")}</b>.
          </p>
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium" role="radiogroup" aria-label="Letters per role">
          {[
            [false, "Same for all"],
            [true, "Different per role"],
          ].map(([value, label]) => (
            <button
              key={label}
              role="radio"
              aria-checked={m.tailoring === value}
              onClick={() => m.setTailoring(value)}
              className={cx(
                "rounded-md px-3 py-1.5 transition",
                m.tailoring === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {m.tailoring && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-500">Pick a role to give it its own letter or resume. Others use the default.</p>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Role being edited">
            {[{ key: DEFAULT, label: "Default" }, ...m.roles].map(({ key, label, count }) => (
              <button
                key={key || "default"}
                role="tab"
                aria-selected={m.editingRole === key}
                onClick={() => m.selectRole(key)}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset transition",
                  m.editingRole === key ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                )}
              >
                {label}
                {count && <span className="opacity-70">({count})</span>}
                {m.isCustomized(key) && <Check className="h-3.5 w-3.5" aria-label="customized" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function LetterCard({ m }) {
  const quillRef = useRef(null);
  const subjectRef = useRef(null);
  const lastFocus = useRef("editor");
  const [writingOwn, setWritingOwn] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const role = m.editingRole === DEFAULT ? null : m.roleLabel(m.editingRole);
  const showGallery = m.letterEditable && !m.currentLetter.text.trim() && !writingOwn;

  const insert = (key) => {
    if (!key) return;
    const token = `{{${key}}}`;
    const input = subjectRef.current;
    if (lastFocus.current === "subject" && input) {
      const start = input.selectionStart ?? m.subject.length;
      const end = input.selectionEnd ?? start;
      m.setSubject(m.subject.slice(0, start) + token + m.subject.slice(end));
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start + token.length, start + token.length);
      });
    } else if (quillRef.current) {
      const range = quillRef.current.getSelection(true);
      quillRef.current.insertText(range.index, token, "user");
      quillRef.current.setSelection(range.index + token.length, 0);
    }
  };

  const pick = (template) => {
    if (template === "own") {
      setWritingOwn(true);
      setChoosing(false);
      return;
    }
    if (m.loadTemplate(template)) setChoosing(false);
  };

  return (
    <Card
      title={role ? `Cover letter for ${role}` : "Cover letter"}
      icon={Mail}
      actions={
        m.letterEditable && !showGallery && (
          <Button variant="secondary" size="sm" onClick={() => setChoosing(true)}>
            <LayoutTemplate className="h-3.5 w-3.5" /> Templates
          </Button>
        )
      }
    >
      {!m.letterEditable ? (
        <UseDefault
          text={`${role} gets your default letter.`}
          summary={m.defaultLetter.text.slice(0, 160)}
          action={`Write a different letter for ${role}`}
          onClick={m.customizeLetter}
        />
      ) : (
        <div className="space-y-4">
          <Field label="Subject" htmlFor="subject" hint={m.roles.length > 1 ? "The same subject goes to every role; use Insert → Role to include it." : undefined}>
            <Input
              id="subject"
              ref={subjectRef}
              value={m.subject}
              onChange={(e) => m.setSubject(e.target.value)}
              onFocus={() => (lastFocus.current = "subject")}
              maxLength={300}
              placeholder="e.g. Application for Frontend Developer"
            />
          </Field>

          {showGallery ? (
            <TemplateGallery m={m} onPick={pick} />
          ) : (
            <>
              <BlanksForm key={m.editorKey} blanks={m.blanksInLetter} onFill={m.fillBlanks} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Text in <span className="font-mono text-indigo-600">{"{{braces}}"}</span> is filled in for each person.
                </p>
                <select
                  value=""
                  onChange={(e) => insert(e.target.value)}
                  className={cx(inputClass, "h-8 w-auto py-0 text-xs")}
                  aria-label="Insert a personal detail"
                >
                  <option value="">Insert a detail…</option>
                  <optgroup label="About the recipient">
                    {["name", "company", "role", ...m.columns.filter((k) => !RECIPIENT_LABELS[k]), "email"].map((key) => (
                      <option key={key} value={key}>{labelFor(key)}</option>
                    ))}
                  </optgroup>
                  <optgroup label="About you">
                    {Object.entries(SENDER_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}{m.sender[key] ? "" : " (not set)"}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div onFocusCapture={() => (lastFocus.current = "editor")}>
                <QuillEditor
                  key={m.editorKey}
                  initialContent={m.currentLetter.html}
                  onReady={(quill) => (quillRef.current = quill)}
                  onChange={m.setLetterHtml}
                />
              </div>
            </>
          )}
          {role && (
            <button onClick={m.resetLetter} className="text-xs font-medium text-slate-500 hover:text-slate-800">
              Use the default letter for {role} instead
            </button>
          )}
        </div>
      )}

      <Modal open={choosing} onClose={() => setChoosing(false)} title="Choose a template" size="lg">
        <TemplateGallery m={m} onPick={pick} />
      </Modal>
    </Card>
  );
}

function TemplateGallery({ m, onPick }) {
  const options = [
    { key: "own", name: "Write my own", description: "Start from a blank page.", icon: PenLine, value: "own" },
    ...m.library.letters.map((l) => ({ key: l._id, name: l.name, description: "Your saved letter", icon: FileText, value: l })),
    ...STARTER_TEMPLATES.map((t) => ({ key: t.id, name: t.name, description: t.description, icon: Sparkles, value: t })),
  ];
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-700">How would you like to start?</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {options.map(({ key, name, description, icon: Icon, value }) => (
          <button
            key={key}
            onClick={() => onPick(value)}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <span>
              <span className="block text-sm font-medium text-slate-900">{name}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Lists the template's [blanks] as a form, so nothing has to be hunted down in the text. */
function BlanksForm({ blanks, onFill }) {
  const [values, setValues] = useState({});
  if (!blanks.length) return null;
  const filled = Object.values(values).filter((v) => v.trim()).length;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onFill(values);
        setValues({});
      }}
      className="rounded-lg border border-amber-200 bg-amber-50/60 p-4"
    >
      <p className="text-sm font-medium text-amber-900">Fill in the blanks ({blanks.length})</p>
      <p className="mt-0.5 text-xs text-amber-800">Type your details; they replace the highlighted text in the letter.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {blanks.map((blank) => (
          <label key={blank} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">{blank.slice(1, -1)}</span>
            <Input
              value={values[blank] ?? ""}
              onChange={(e) => setValues({ ...values, [blank]: e.target.value })}
              className="bg-white"
            />
          </label>
        ))}
      </div>
      <Button type="submit" size="sm" className="mt-3" disabled={!filled}>
        Fill in {filled > 0 ? plural(filled, "blank") : "blanks"}
      </Button>
    </form>
  );
}

function ResumeCard({ m, onPreview }) {
  const role = m.editingRole === DEFAULT ? null : m.roleLabel(m.editingRole);
  const attachedIds = new Set(m.currentFiles.map((f) => f.docId));
  const unsaved = m.currentFiles.filter((f) => !f.docId);

  return (
    <Card title={role ? `Resume for ${role}` : "Resume & attachments"} icon={Paperclip}>
      {!m.filesEditable ? (
        <UseDefault
          text={`${role} gets your default files.`}
          summary={m.defaultFiles.map((f) => f.name).join(", ") || "No default files yet."}
          action={`Attach different files for ${role}`}
          onClick={m.customizeFiles}
        />
      ) : (
        <div className="space-y-4">
          {!role && m.autoAttachedName && (
            <p className="text-sm text-slate-600">
              We ticked <b>{m.autoAttachedName}</b> for you. Change it below if that&apos;s not the right file.
            </p>
          )}
          {m.library.files.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {[...m.library.files, ...unsaved].map((doc) => {
                const id = doc._id ?? doc.id;
                const checked = doc._id ? attachedIds.has(doc._id) : true;
                return (
                  <li key={id} className="flex items-center gap-3 px-3 py-2">
                    <input
                      id={`file-${id}`}
                      type="checkbox"
                      checked={checked}
                      disabled={m.busyFile === id || !doc._id}
                      onChange={() => m.toggleLibraryFile(doc)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <label htmlFor={`file-${id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block truncate text-sm font-medium text-slate-800">{doc.name}</span>
                      {doc.createdAt && <span className="text-xs text-slate-500">Added {formatDate(doc.createdAt)}</span>}
                    </label>
                    {checked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPreview(m.currentFiles.find((f) => f.docId === id || f.id === id))}
                        aria-label={`Preview ${doc.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Dropzone
            onFiles={m.addFiles}
            disabled={m.busyFile === "upload"}
            title={m.busyFile === "upload" ? "Uploading…" : m.library.files.length ? "Upload another PDF" : "Upload your resume (PDF)"}
            hint="Saved to Documents, so it's ready next time"
          />
          {role && (
            <button onClick={m.resetFiles} className="text-xs font-medium text-slate-500 hover:text-slate-800">
              Use the default files for {role} instead
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function UseDefault({ text, summary, action, onClick }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-800">{text}</p>
      {summary && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{summary}</p>}
      <Button size="sm" variant="secondary" className="mt-3" onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}
