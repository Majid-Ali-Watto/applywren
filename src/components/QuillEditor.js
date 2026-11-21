"use client";
import { useEffect, useRef } from "react";
import "quill/dist/quill.snow.css";
import { safeHtml } from "@/utils/safeHtml";

const SIZES = ["10px", "12px", "14px", "16px", "18px", "24px", "32px"];
const TOOLBAR = [
  [{ header: [1, 2, 3, false] }, { size: [...SIZES, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
  [{ align: [] }],
  ["link", "blockquote"],
  ["clean"],
];

/**
 * Rich-text editor. Remount (change `key`) to load different content.
 * onReady(quill) exposes the instance; onChange(html, text) fires on every edit.
 */
export default function QuillEditor({ initialContent = "", onReady, onChange, placeholder }) {
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false; // guards double-mount in React strict mode
    let quill;

    (async () => {
      const Quill = (await import("quill")).default;
      if (cancelled || !editorRef.current) return;

      const Size = Quill.import("attributors/style/size");
      Size.whitelist = SIZES;
      Quill.register(Size, true);

      quill = new Quill(editorRef.current, {
        theme: "snow",
        placeholder: placeholder || "Write your cover letter…",
        modules: { toolbar: TOOLBAR },
      });
      quill.root.innerHTML = safeHtml(initialContent);
      quill.update();
      quill.history.clear();

      const emit = () => onChangeRef.current?.(quill.root.innerHTML, quill.getText());
      quill.on("text-change", emit);
      emit();
      onReady?.(quill);
    })();

    return () => {
      cancelled = true;
      quill?.off("text-change");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content is loaded once per mount
  }, []);

  return (
    <div className="editor rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
      <div ref={editorRef} />
    </div>
  );
}
