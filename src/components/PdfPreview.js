"use client";
import { useEffect, useState } from "react";
import { Modal } from "./ui";
import { base64ToBlob } from "@/utils/files";

/** Shows a `{ name, base64 }` PDF in a modal; pass `file={null}` to close. */
export default function PdfPreview({ file, onClose }) {
  // The object URL is created in an effect, so it lags one render behind
  // `file`. Keep it paired with its file and only use it while they match;
  // otherwise closing (file -> null) or switching files renders a stale URL.
  const [loaded, setLoaded] = useState({ file: null, url: null });

  useEffect(() => {
    if (!file?.base64) return;
    const url = URL.createObjectURL(base64ToBlob(file.base64));
    setLoaded({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const url = file && loaded.file === file ? loaded.url : null;

  return (
    <Modal open={Boolean(file)} onClose={onClose} title={file?.name || "Preview"} size="xl">
      {url && <iframe src={url} title={file.name} className="h-[75vh] w-full rounded-lg border border-slate-200" />}
    </Modal>
  );
}
