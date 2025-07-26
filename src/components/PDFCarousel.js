import React, { useState } from "react";
import Embed from "./Embed";
import { getFileSource } from "@/utils/getFileSource";

export default function PDFCarousel({ files, onRemove }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!files || files.length === 0) return null;

  const prev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : files.length - 1));
  const next = () => setCurrentIndex((i) => (i + 1) % files.length);

  const currentFile = files[currentIndex];

  return (
    <div className="relative w-full">
      {/* File Viewer */}
      <div className="rounded border overflow-hidden w-full max-w-full h-[60vh] sm:h-[75vh]">
        <Embed
          src={getFileSource(currentFile)}
          className="w-full h-full"
        />
      </div>

      {/* File Name + Remove */}
      <div className="mt-2 flex justify-between items-center text-sm text-gray-600">
        <span className="truncate max-w-[70%]">{currentFile.name || `File ${currentIndex + 1}`}</span>
        {onRemove && (
          <button
            onClick={() => onRemove(currentIndex)}
            className="text-red-600 border p-1 rounded text-xs hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      {/* Navigation */}
      {files.length > 1 && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={prev}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {files.length}
          </span>
          <button
            onClick={next}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
