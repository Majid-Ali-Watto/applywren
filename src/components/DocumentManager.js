"use client";
import React, { useState, useEffect, useRef } from "react";
import QuillEditor from "./QuillEditor";
import { handleDownloadPDF } from "@/utils/downloadPDF";
import { uploadFiles } from "@/utils/uploadDocuments";

export default function DocumentManager({ userId, onSelect }) {
  const [resumes, setResumes] = useState([]);
  const [coverLetters, setCoverLetters] = useState([]);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [savingLetter, setSavingLetter] = useState(false);
  const [showLetterEditor, setShowLetterEditor] = useState(false);
  const [editingLetter, setEditingLetter] = useState(null);
  const [letterName, setLetterName] = useState("");
  const [letterEditorInstance, setLetterEditorInstance] = useState(null);
  const [editorKey, setEditorKey] = useState(""); // force new instance each time
  const [loading, setLoading] = useState(true);
 
  const token = sessionStorage.getItem("authToken");
  useEffect(() => {
    if (!token) {
      // Redirect to login or show error
      console.error("No authentication token found");
      // You might want to redirect to login here
      // window.location.href = '/login';
      return;
    }
    fetchDocuments();
  }, [userId]);

  const fetchDocuments = async () => {
    try {
      if (!token) {
        console.error("No auth token found");
        return;
      }
      setLoading(true)
      const res = await fetch("/api/documents?userId=" + userId, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (data.error) {
        console.error("Error fetching documents:", data.error);
        return;
      }

      setResumes(data.filter((doc) => doc.type === "resume"));
      setCoverLetters(data.filter((doc) => doc.type === "coverLetter"));
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
    finally{
      setLoading(false)
    }
  };
   if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleResumeUpload = async (e) => {
    try {
      const resumes = Array.from(e.target.files || []);
      if (resumes.length === 0) return;

      setUploadingResume(true);
      await uploadFiles(resumes, userId);
      await fetchDocuments();
    } catch (error) {
      console.error("Error uploading resumes:", error);
      alert("Failed to upload resumes. Please try again.");
    } finally {
      setUploadingResume(false);
    }
  };
  const handleDeleteDocument = async (id) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    await fetch(`/api/documents/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    fetchDocuments();
  };


  const handleEditLetter = (letter) => {
    setEditingLetter(letter);
    setLetterName(letter.name);
    setEditorKey(Date.now().toString()); // force fresh editor
    setShowLetterEditor(true);
  };
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">My Files</h3>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleResumeUpload}
        className="w-full border border-gray-300 rounded p-2 mb-2"
          
        />
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
  {resumes.map((file) => (
    <div
      key={file._id}
      className="p-2 border rounded hover:bg-gray-50 cursor-pointer group"
    >
      <div className="flex justify-between items-center">
        <span onClick={() => onSelect("resume", file)}>{file.name}</span>
        <button
          onClick={() => handleDeleteDocument(file._id)}
          className="text-red-500 group-hover:opacity-100"
        >
          🗑️
        </button>
      </div>
    </div>
  ))}
</div>

      </div>
        <hr/>
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">My Cover Letters</h3>

          <button
            onClick={() => {
              setShowLetterEditor(true);
              setEditingLetter(null);
              setLetterName("");
              setEditorKey(Date.now().toString()); // force fresh editor
            }}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            +
          </button>
        </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
  {coverLetters.map((letter) => (
    <div
      key={letter._id}
      className="p-3 border rounded hover:bg-gray-50 cursor-pointer group"
    >
      <div className="flex justify-between items-center">
        <span onClick={() => onSelect("coverLetter", letter)}>
          {letter.name}
        </span>
        <div className="group-hover:opacity-100 flex gap-x-4 gap-y-2">
          <button
            onClick={() => handleEditLetter(letter)}
            className="text-blue-500"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDeleteDocument(letter._id)}
            className="text-red-500"
          >
            🗑️
          </button>
          <button
            onClick={() => handleDownloadPDF(letter)}
            className="text-green-500"
          >
            ⬇️
          </button>
        </div>
      </div>
    </div>
  ))}
</div>

      </div>

      {showLetterEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingLetter ? "Edit Cover Letter" : "New Cover Letter"}
              </h2>
              <button
                onClick={() => {
                  setShowLetterEditor(false);
                  setEditingLetter(null);
                  setLetterName("");
                  setLetterEditorInstance(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              placeholder="Cover Letter Name"
              value={letterName}
              onChange={(e) => setLetterName(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mb-4"
            />

            {/* QuillEditor with key to remount each time */}
            <QuillEditor
              key={editorKey}
              initialContent={editingLetter?.content || ""}
              onReady={(quillInstance) =>
                setLetterEditorInstance(quillInstance)
              }
            />

            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={() =>
                  handleDownloadPDF({
                    name: letterName || "cover-letter",
                    content: letterEditorInstance?.root.innerHTML || "",
                  })
                }
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Download PDF
              </button>
              <button
                onClick={async () => {
                  if (!letterName) {
                    alert("Please enter a name");
                    return;
                  }
                  setSavingLetter(true);

                  const content = letterEditorInstance?.root.innerHTML || "";

                  const method = editingLetter ? "PUT" : "POST";
                  const url = editingLetter
                    ? `/api/documents/${editingLetter._id}`
                    : "/api/documents";

                  await fetch(url, {
                    method,
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      userId,
                      type: "coverLetter",
                      name: letterName,
                      content,
                    }),
                  });

                  setSavingLetter(false);
                  setShowLetterEditor(false);
                  setEditingLetter(null);
                  setLetterName("");
                  setLetterEditorInstance(null);
                  fetchDocuments();
                }}
                disabled={savingLetter}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {savingLetter ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
