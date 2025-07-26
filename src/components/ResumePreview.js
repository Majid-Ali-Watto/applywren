"use client";
import React from "react";
import PDFCarousel from "./PDFCarousel"; // <- Import your carousel

export default function ResumePreview({ resumes, onRemove }) {
  if (!resumes.length) return null;

  return (
    <div className="mt-6 p-4 border border-gray-300 rounded bg-gray-50 shadow">
      <h3 className="font-semibold text-gray-700 mb-4">Attached Resumes</h3>
      <PDFCarousel files={resumes} onRemove={onRemove} />
    </div>
  );
}
