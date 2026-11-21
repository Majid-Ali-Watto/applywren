"use client";
import { Send } from "lucide-react";
import { cx } from "./ui";

export function Logo({ inverted = false }) {
  return (
    <span className="relative inline-flex items-center gap-2.5">
      <span
        className={cx(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          inverted ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
        )}
      >
        <Send className="h-4 w-4 -translate-x-px translate-y-px" aria-hidden />
      </span>
      <span className={cx("text-base font-semibold tracking-tight", inverted ? "text-white" : "text-slate-900")}>
        Applywren
      </span>
    </span>
  );
}
