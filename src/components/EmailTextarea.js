"use client";

import React, { useState, useRef, useEffect } from "react";
// import { X } from "lucide-react";

export default function EmailTextarea({ label, value, onChange }) {
  const [inputValue, setInputValue] = useState("");
  const [emails, setEmails] = useState([]);

  useEffect(() => {
  if (Array.isArray(value)) {
    const deduped = value
      .map((e) => e.trim())
      .filter((e, i, arr) => e && arr.indexOf(e) === i);

    const isSame =
      deduped.length === emails.length &&
      deduped.every((e, i) => e === emails[i]);

    if (!isSame) setEmails(deduped);
  }
}, [value]);


  useEffect(() => {
    onChange(emails.join(", "));
  }, [emails]);

  const handleInput = (e) => {
    const val = e.target.value;
    if (val.endsWith(",")) {
      const cleaned = val.slice(0, -1).trim();
      if (cleaned && !emails.includes(cleaned)) {
        setEmails([...emails, cleaned]);
      }
      setInputValue("");
    } else {
      setInputValue(val);
    }
  };

  const handleRemove = (emailToRemove) => {
    setEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        if (!emails.includes(inputValue.trim())) {
          setEmails([...emails, inputValue.trim()]);
        }
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue) {
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div>
      <label className="block font-medium mb-1">{label}</label>
      <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded p-2 min-h-[44px]">
        {emails.map((email) => (
          <span
            key={email}
            className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm"
          >
            {email} |
            <button
              type="button"
              onClick={() => handleRemove(email)}
              className="text-blue-700 hover:text-red-500"
            >
              {/* <X size={14} /> */}X
            </button>
          </span>
        ))}
        <input
          type="text"
          className="flex-grow min-w-[120px] focus:outline-none text-sm"
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type email and press comma"
        />
      </div>
    </div>
  );
}
