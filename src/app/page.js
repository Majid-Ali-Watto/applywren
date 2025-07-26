"use client";

import React, { useState, useRef, useEffect } from "react";
import EmailImport from "../components/EmailImport";
import EmailTextarea from "../components/EmailTextarea";
import ResumeUpload from "../components/ResumeUpload";
import ResumePreview from "../components/ResumePreview";
import QuillEditor from "../components/QuillEditor";
import Loader from "../components/Loader";
import Login from "@/components/Login";
import DocumentManager from "@/components/DocumentManager";
import ApplicationHistory from "@/components/ApplicationHistory";
import EmailPreview from "@/components/EmailPreview";
import { createPortal } from "react-dom";

export default function Home() {
  const [emails, setEmails] = useState([]);
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const [subject, setSubject] = useState("");
  const [resumeFiles, setResumeFiles] = useState([]);
  const [resumeNames, setResumeNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);
  const [selectedLetterContent, setSelectedLetterContent] = useState("");
  const [editorKey, setEditorKey] = useState("");
  const [letterEditorInstance, setLetterEditorInstance] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [user, setUser] = useState(null);
  const [showDocManager, setShowDocManager] = useState(false);

  useEffect(() => {
    document.body.style.overflow = showDocManager ? "hidden" : "unset";
    return () => (document.body.style.overflow = "unset");
  }, [showDocManager]);

  const closeDocManager = () => {
    setShowDocManager(false);
    setShowHistory(false);
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") closeDocManager();
    };
    if (showDocManager) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showDocManager]);

  if (!user) return <Login onVerified={setUser} />;

  const handleDocumentSelect = (type, doc) => {
    if (type === "resume") {
      const byteCharacters = atob(doc.content);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = [...slice].map((c) => c.charCodeAt(0));
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      const blob = new Blob(byteArrays, { type: "application/pdf" });
      const file = new File([blob], doc.name || "file.pdf", {
        type: "application/pdf",
      });
      setResumeFiles((prev) => [...prev, file]);
    } else if (type === "coverLetter") {
      setSelectedLetterContent(doc.content);
      setEditorKey(Date.now().toString());
    }
    setShowDocManager(false);
  };

  const handleRemoveResume = (index) => {
    setResumeFiles((prev) => prev.filter((_, idx) => idx !== index));
    setResumeNames((prev) => prev.filter((_, idx) => idx !== index));
  };

  const buildHtml = () =>
    `<div style="font-family: sans-serif; line-height: 1.6;">${
      letterEditorInstance?.root.innerHTML || ""
    }</div>`;

  const handleSend = async () => {
    if (!resumeFiles.length) return alert("Please upload at least one file.");
    setLoading(true);
    try {
      const filePromises = resumeFiles.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ base64: reader.result.split(",")[1], name: file.name });
            reader.readAsDataURL(file);
          })
      );
      const filesData = await Promise.all(filePromises);
      const htmlBody = buildHtml();
      const token = sessionStorage.getItem("authToken");
      if (!token) return setError("Missing authentication data");

      await fetch(`/api/applications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          mainEmails: emails,
          ccEmails: cc.filter(Boolean),
          bccEmails: bcc.filter(Boolean),
          subject,
          coverLetter: htmlBody,
          resumes: filesData,
        }),
      });

      const res = await fetch(`/api/sendEmails?userId=${user?.userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: emails,
          cc: cc.filter(Boolean),
          bcc: bcc.filter(Boolean),
          htmlCoverLetter: htmlBody,
          subject,
          resumes: filesData,
        }),
      });

      const data = await res.json();
      const failed = Array.isArray(data)
        ? data.filter((r) => r.status === "rejected").length
        : data?.error;
      setStatus(`Sent. Failed: ${failed || 0}`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to send emails");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    const html = buildHtml();
    setPreviewHtml(html);
    setShowPreview(true);
  };

  return (
    <main className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl mt-10 border border-gray-200">
      <h1 className="text-4xl font-bold mb-6 text-center text-blue-700 tracking-tight">
        Bulk Job Application Sender
      </h1>

      <div className="flex justify-between items-center flex-wrap mb-4">
        <button
          onClick={() => setShowDocManager(true)}
          className="text-blue-600 hover:underline"
        >
          📁 Document Manager
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className="text-blue-600 hover:underline"
        >
          📜 Application History
        </button>
      </div>

      {(showDocManager || showHistory) &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={closeDocManager}
              aria-hidden="true"
            />

            <div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="doc-manager-title"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col relative animate-modal-enter overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-6 border-b">
                  <h2 id="doc-manager-title" className="text-xl font-semibold">
                    {showDocManager
                      ? "Document Manager"
                      : "Application History"}
                  </h2>
                  <button
                    onClick={closeDocManager}
                    className="text-gray-500 hover:text-gray-700 p-2"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {showDocManager && (
                    <DocumentManager
                      userId={user?.userId}
                      onSelect={(type, doc) => {
                        handleDocumentSelect(type, doc);
                        closeDocManager();
                      }}
                    />
                  )}
                  {showHistory && <ApplicationHistory userId={user?.userId} />}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      <div className="space-y-6">
        <EmailImport onEmailsImported={setEmails} />
        {/* <EmailTextarea label="To" value={emails} onChange={setEmails} /> */}
        <EmailTextarea
          label="To"
          value={emails} // pass string (so internal logic can split it)
          onChange={(str) => setEmails(str.split(/[\s,]+/).filter(Boolean))}
        />

        <div className="flex gap-4 mb-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showCC}
              onChange={(e) => setShowCC(e.target.checked)}
              className="accent-blue-600"
            />
            <span>CC</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showBCC}
              onChange={(e) => setShowBCC(e.target.checked)}
              className="accent-blue-600"
            />
            <span>BCC</span>
          </label>
        </div>

        {showCC && (
          <EmailTextarea
            label="CC"
            value={cc} // pass string (so internal logic can split it)
            onChange={(str) => setCc(str.split(/[\s,]+/).filter(Boolean))}
          />
        )}
        {showBCC && (
          <EmailTextarea
            label="BCC"
            value={bcc} // pass string (so internal logic can split it)
            onChange={(str) => setBcc(str.split(/[\s,]+/).filter(Boolean))}
          />
        )}

        <div>
          <label className="block font-medium mb-1">Subject</label>
          <input
            className="w-full border border-gray-300 rounded p-2"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Cover Letter</label>
          <QuillEditor
            key={editorKey}
            initialContent={selectedLetterContent}
            onReady={(quill) => setLetterEditorInstance(quill)}
          />
        </div>

        <ResumeUpload
          onFilesChange={(resumes) => {
            setResumeFiles((prev) => [...prev, ...resumes]);
            setResumeNames((prev) => [...prev, ...resumes.map((f) => f.name)]);
          }}
          fileNames={resumeNames}
        />

        <div className="flex gap-4 mt-4 justify-end">
          <button
            onClick={handlePreview}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            disabled={loading}
          >
            Preview
          </button>
          <button
            onClick={handleSend}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send to All"}
          </button>
        </div>

        {loading && <Loader />}
        {status && (
          <p className="text-green-600 font-medium text-center">{status}</p>
        )}
        {showPreview && <EmailPreview html={previewHtml} />}
        <ResumePreview resumes={resumeFiles} onRemove={handleRemoveResume} />
      </div>
    </main>
  );
}
