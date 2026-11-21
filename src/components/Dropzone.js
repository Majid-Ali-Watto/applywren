"use client";
import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { cx } from "./ui";

export default function Dropzone({ onFiles, accept = "application/pdf", multiple = true, title, hint, disabled }) {
  const [over, setOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    if (!disabled && e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cx(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
        over ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <UploadCloud className="mb-2 h-6 w-6 text-slate-400" aria-hidden />
      <span className="text-sm font-medium text-slate-700">
        {title || "Drop PDFs here"} <span className="text-indigo-600">or browse</span>
      </span>
      {hint && <span className="mt-1 text-xs text-slate-500">{hint}</span>}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files.length) onFiles([...e.target.files]);
          e.target.value = "";
        }}
      />
    </label>
  );
}
