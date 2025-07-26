"use client";
import React from "react";
import Chip from "./Chip";

export default function ResumeUpload({ onFilesChange, fileNames }) {
  return (
    <div>
      <label className="block font-medium mb-1">
        File (PDF, multiple allowed)
      </label>
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={(e) => {
          const resumes = Array.from(e.target.files || []);
          onFilesChange(resumes);
        }}
        className="w-full border border-gray-300 rounded p-2"
      />
      {fileNames.length > 0 && (
        <ul className="flex flex-row flex-wrap w-full mt-2 text-sm text-gray-600 gap-2">
          {fileNames.map((name, idx) => (
            <li className="w-fit mt-2" key={idx}>
              <Chip title={name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
