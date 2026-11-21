"use client";
import { forwardRef, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none " +
  "focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50";

const BUTTON_VARIANTS = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-indigo-600",
  secondary: "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 shadow-sm hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "text-red-600 hover:bg-red-50",
};
const BUTTON_SIZES = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-8 w-8 justify-center",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ title, description, icon: Icon, actions, children, className, bodyClassName }) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            )}
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
              {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Field({ label, htmlFor, hint, error, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx(inputClass, className)} {...props} />;
});

export function Spinner({ className }) {
  return <Loader2 className={cx("h-5 w-5 animate-spin text-indigo-600", className)} aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      )}
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Modal built on the native <dialog> (focus trap, Escape and backdrop for free). */
export function Modal({ open, onClose, title, children, footer, size = "md" }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const width = { md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-xl bg-white p-0 shadow-2xl",
        "max-h-[calc(100vh-2rem)] backdrop:bg-transparent",
        width
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}

export const STATUS_STYLES = {
  pending: { label: "Pending", dot: "bg-amber-400", pill: "bg-amber-50 text-amber-800 ring-amber-200" },
  interviewing: { label: "Interviewing", dot: "bg-sky-500", pill: "bg-sky-50 text-sky-800 ring-sky-200" },
  rejected: { label: "Rejected", dot: "bg-rose-500", pill: "bg-rose-50 text-rose-800 ring-rose-200" },
  accepted: { label: "Accepted", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};

export function Badge({ children, className }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className || "bg-slate-50 text-slate-700 ring-slate-200"
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ name }) {
  const palette = ["bg-indigo-100 text-indigo-700", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-700", "bg-violet-100 text-violet-700"];
  const text = String(name || "?");
  const hash = [...text].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return (
    <span
      className={cx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
        palette[hash % palette.length]
      )}
      aria-hidden
    >
      {text.trim()[0]?.toUpperCase() || "?"}
    </span>
  );
}
