"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Mail, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { apiFetch } from "@/utils/api";
import { formatDate } from "@/utils/appliedTime";
import { handleDownloadPDF } from "@/utils/downloadPDF";
import { formatBytes, htmlToText, uploadFiles } from "@/utils/files";
import { MAX_FILE_BYTES } from "@/lib/limits";
import { STARTER_TEMPLATES } from "@/lib/starterTemplates";
import QuillEditor from "./QuillEditor";
import Dropzone from "./Dropzone";
import PdfPreview from "./PdfPreview";
import { useToast } from "./Toast";
import { Button, Card, Field, Input, Modal, PageLoader } from "./ui";

export default function Documents() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  // Letter editor: null when closed, else { id?, name, content, key }
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const quillRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setDocs(await apiFetch("/api/documents"));
    } catch (err) {
      toast(`Could not load documents: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const files = docs.filter((d) => d.type === "file");
  const letters = docs.filter((d) => d.type === "coverLetter");

  const upload = async (selected) => {
    const pdfs = selected.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    const tooBig = pdfs.filter((f) => f.size > MAX_FILE_BYTES);
    if (pdfs.length < selected.length) toast("Only PDF files can be uploaded", "error");
    if (tooBig.length) toast(`${tooBig.map((f) => f.name).join(", ")} is over ${formatBytes(MAX_FILE_BYTES)}`, "error");
    const ok = pdfs.filter((f) => f.size <= MAX_FILE_BYTES);
    if (!ok.length) return;

    setUploading(true);
    try {
      await uploadFiles(ok);
      toast(`Uploaded ${ok.length === 1 ? ok[0].name : `${ok.length} files`}`);
      await load();
    } catch (err) {
      toast(`Upload failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const preview = async (doc) => {
    setBusyId(doc._id);
    try {
      const full = await apiFetch(`/api/documents/${doc._id}`);
      setPreviewFile({ name: full.name, base64: full.content });
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (doc) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    setBusyId(doc._id);
    try {
      await apiFetch(`/api/documents/${doc._id}`, { method: "DELETE" });
      setDocs((all) => all.filter((d) => d._id !== doc._id));
      toast(`Deleted ${doc.name}`);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const download = async (letter) => {
    try {
      await handleDownloadPDF(letter);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const saveLetter = async () => {
    const name = draft.name.trim();
    if (!name) return toast("Give the letter a name", "error");
    if (!quillRef.current?.getText().trim()) return toast("The letter is empty", "error");
    setSaving(true);
    try {
      await apiFetch(draft.id ? `/api/documents/${draft.id}` : "/api/documents", {
        method: draft.id ? "PUT" : "POST",
        body: { type: "coverLetter", name, content: quillRef.current.root.innerHTML },
      });
      toast(`Saved ${name}`);
      setDraft(null);
      await load();
    } catch (err) {
      toast(`Save failed: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Resumes & files" description="PDFs you can attach to any application." icon={FileText}>
        <Dropzone
          onFiles={upload}
          disabled={uploading}
          title={uploading ? "Uploading…" : "Drop PDFs to upload"}
          hint={`Up to ${formatBytes(MAX_FILE_BYTES)} each`}
        />
        {files.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-500">No files yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {files.map((doc) => (
              <li key={doc._id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{doc.name}</p>
                  <p className="text-xs text-slate-500">Added {formatDate(doc.createdAt)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => preview(doc)} loading={busyId === doc._id} aria-label={`Preview ${doc.name}`}>
                  {busyId !== doc._id && <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="danger" size="icon" onClick={() => remove(doc)} disabled={busyId === doc._id} aria-label={`Delete ${doc.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Cover letters"
        description="Templates you can load into a new application."
        icon={Mail}
        actions={
          <Button size="sm" onClick={() => setDraft({ name: "", content: "", key: Date.now() })}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        }
      >
        {letters.length === 0 ? (
          <p className="py-2 text-sm text-slate-500">
            No saved letters yet. Write one, or customize a starter template below.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {letters.map((letter) => (
              <li key={letter._id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{letter.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{htmlToText(letter.content) || "Empty"}</p>
                </div>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDraft({ id: letter._id, name: letter.name, content: letter.content, key: Date.now() })}
                    aria-label={`Edit ${letter.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => download(letter)} aria-label={`Download ${letter.name} as PDF`}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="danger" size="icon" onClick={() => remove(letter)} disabled={busyId === letter._id} aria-label={`Delete ${letter.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Sparkles className="h-3.5 w-3.5" /> Starter templates
          </h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {STARTER_TEMPLATES.map((template) => (
              <li key={template.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{template.name}</p>
                  <p className="text-xs text-slate-500">{template.description}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDraft({ name: template.name, content: template.html, key: Date.now() })}
                >
                  Customize
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit cover letter" : "New cover letter"}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              className="mr-auto"
              onClick={() => download({ name: draft.name || "cover-letter", content: quillRef.current?.root.innerHTML || "" })}
            >
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={saveLetter} loading={saving}>Save</Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Name" htmlFor="letter-name">
              <Input
                id="letter-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Frontend roles"
                maxLength={200}
                autoFocus
              />
            </Field>
            <QuillEditor key={draft.key} initialContent={draft.content} onReady={(quill) => (quillRef.current = quill)} />
            <p className="text-xs text-slate-500">
              Placeholders like {"{{company}}"} and {"{{role}}"} are filled in per recipient when you send;{" "}
              {"{{name|Hiring Manager}}"} uses the text after | when a value is missing. Replace any [bracketed] text with your own details.
            </p>
          </div>
        )}
      </Modal>

      <PdfPreview file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
