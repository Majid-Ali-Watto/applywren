"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(() => {});

const STYLES = {
  success: { icon: CheckCircle2, color: "text-emerald-500" },
  error: { icon: AlertCircle, color: "text-red-500" },
  info: { icon: Info, color: "text-indigo-500" },
};

/** Provides `useToast()`: toast("Saved") or toast("Failed", "error"). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (text, type = "success") => {
      const id = crypto.randomUUID();
      setToasts((all) => [...all.slice(-3), { id, text, type }]);
      setTimeout(() => dismiss(id), type === "error" ? 7000 : 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-4 sm:top-auto sm:bottom-16 sm:items-end"
      >
        {toasts.map(({ id, text, type }) => {
          const { icon: Icon, color } = STYLES[type];
          return (
            <div
              key={id}
              role={type === "error" ? "alert" : "status"}
              className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-hidden />
              <p className="flex-1 text-sm text-slate-700">{text}</p>
              <button
                onClick={() => dismiss(id)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
