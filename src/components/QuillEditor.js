"use client";
import React, { useEffect, useRef } from "react";
import "quill/dist/quill.snow.css";

export default function QuillEditor({ initialContent = "", onReady }) {
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    const initialize = async () => {
      if (typeof window === "undefined") return;

      const QuillModule = await import("quill");
      const Quill = QuillModule.default;

      const Size = Quill.import("attributors/style/size");
      Size.whitelist = ["10px", "12px", "14px", "16px", "18px", "24px", "32px"];
      Quill.register(Size, true);

      const toolbarOptions = [
        ["bold", "italic", "underline", "strike"],
        ["blockquote", "code-block"],
        ["link", "image", "video", "formula"],
        [{ header: 1 }, { header: 2 }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ script: "sub" }, { script: "super" }],
        [{ indent: "-1" }, { indent: "+1" }],
        [{ direction: "rtl" }],
        [{ size: ["10px", "12px", "14px", "16px", "18px", "24px", "32px", false] }],
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ color: [] }, { background: [] }],
        [{ font: [] }],
        [{ align: [] }],
        ["clean"],
      ];

      const quill = new Quill(editorRef.current, {
        theme: "snow",
        placeholder: "Write your cover letter here...",
        modules: { toolbar: toolbarOptions },
      });

      quill.root.innerHTML = initialContent || "";

      if (onReady) {
        onReady(quill);
      }

      quillRef.current = quill;
    };

    initialize();
  }, []);

  return (
    <div className="border border-gray-300 rounded bg-white p-2 min-h-[150px]">
      <div ref={editorRef} className="min-h-[150px]" />
    </div>
  );
}
