"use client";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { isEmail } from "@/lib/validate";
import { cx } from "./ui";

const SEPARATORS = /[\s,;]+/;

/** Adds addresses not already in `list` (case-insensitive). */
export function mergeEmails(list, additions) {
  const seen = new Set(list.map((e) => e.toLowerCase()));
  const merged = [...list];
  for (const raw of additions) {
    const email = raw.trim();
    if (email && !seen.has(email.toLowerCase())) {
      seen.add(email.toLowerCase());
      merged.push(email);
    }
  }
  return merged;
}

/**
 * Email chips input. Enter, comma, space or paste adds addresses; Backspace on
 * an empty input removes the last one. `describe(email)` adds a sub-label.
 */
export default function RecipientInput({ id, emails, onChange, placeholder, describe }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const commit = (text = draft) => {
    const parts = text.split(SEPARATORS).filter(Boolean);
    if (parts.length) onChange(mergeEmails(emails, parts));
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (["Enter", ",", ";", " "].includes(e.key) || (e.key === "Tab" && draft.trim())) {
      if (draft.trim()) {
        e.preventDefault();
        commit();
      } else if (e.key !== "Tab") {
        e.preventDefault();
      }
    } else if (e.key === "Backspace" && !draft && emails.length) {
      onChange(emails.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text");
    if (SEPARATORS.test(text.trim())) {
      e.preventDefault();
      commit(`${draft} ${text}`);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-11 cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20"
    >
      {emails.map((email) => {
        const valid = isEmail(email);
        const detail = valid && describe?.(email);
        return (
          <span
            key={email}
            title={valid ? undefined : "Not a valid email address"}
            className={cx(
              "inline-flex max-w-full items-center gap-1 rounded-md py-0.5 pl-2 pr-1 text-sm",
              valid ? "bg-slate-100 text-slate-700" : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
            )}
          >
            <span className="truncate">{email}</span>
            {detail && <span className="truncate text-xs text-slate-500">· {detail}</span>}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(emails.filter((x) => x !== email));
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              aria-label={`Remove ${email}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        );
      })}
      <input
        id={id}
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => commit()}
        placeholder={emails.length ? "" : placeholder}
        className="min-w-[12rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400"
        autoComplete="off"
      />
    </div>
  );
}
