"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSpreadsheet, LineChart, Send } from "lucide-react";
import { apiFetch } from "@/utils/api";
import { Button, Field, Input, cx } from "./ui";
import { Logo } from "./Logo";

const FEATURES = [
  { icon: FileSpreadsheet, text: "Import recruiters from a spreadsheet and personalize every email" },
  { icon: Send, text: "Each company gets its own message with your resume attached" },
  { icon: LineChart, text: "Track every application from pending to offer" },
];

const PASSWORD_HINT = "At least 8 characters. Avoid common passwords.";

// login | register | verify (new account code) | forgot (ask for a reset code) | reset (code + new password)
const HEADINGS = {
  login: ["Welcome back", "Sign in to continue applying."],
  register: ["Create your account", "It takes less than a minute."],
  verify: ["Check your inbox", null],
  forgot: ["Reset your password", "We'll email you a code to set a new one."],
  reset: ["Choose a new password", null],
};

export const legalLinkClass = "font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline";

export default function Login({ onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const run = (action) => async (e) => {
    e?.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setCode("");
    setError("");
    setNotice("");
  };

  const login = async () => {
    const data = await apiFetch("/api/login", { method: "POST", body: { email, password } });
    if (data.needsVerification) switchMode("verify");
    else onSignedIn();
  };
  const requestReset = () => apiFetch("/api/password-reset", { method: "POST", body: { email } });

  // The session itself is an HttpOnly cookie set by these responses.
  const handleSubmit = run(async () => {
    if (mode === "login") return login();
    if (mode === "register") {
      await apiFetch("/api/register", { method: "POST", body: { email, password, name } });
      return switchMode("verify");
    }
    if (mode === "verify") {
      await apiFetch("/api/verify", { method: "POST", body: { email, code, password } });
      return onSignedIn();
    }
    if (mode === "forgot") {
      await requestReset();
      setPassword("");
      return switchMode("reset");
    }
    await apiFetch("/api/password-reset/confirm", { method: "POST", body: { email, code, password } });
    onSignedIn();
  });

  // Signing in again (or asking again) re-sends the code; the server allows one per minute.
  const resend = run(async () => {
    await (mode === "verify" ? login() : requestReset());
    setNotice("If a minute has passed since the last one, a new code is on its way.");
  });

  const [title, subtitle] = HEADINGS[mode];
  const needsCode = mode === "verify" || mode === "reset";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-indigo-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 70%, #a5b4fc 0, transparent 45%)",
          }}
          aria-hidden
        />
        <Logo inverted />
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Apply to more jobs,
            <br />
            with less copy-paste.
          </h1>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-indigo-50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="pt-1 text-sm leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-indigo-200">
          Your documents and history stay private to your account.
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          {mode !== "login" && mode !== "register" && (
            <button
              onClick={() => switchMode("login")}
              className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </button>
          )}
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {needsCode ? (
              <>
                We sent a 6-digit code to <span className="font-medium text-slate-800">{email}</span>
                {mode === "reset" && " if it has an account"}.
              </>
            ) : (
              subtitle
            )}
          </p>

          {(mode === "login" || mode === "register") && (
            <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium" role="tablist">
              {[
                ["login", "Sign in"],
                ["register", "Create account"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => switchMode(value)}
                  className={cx(
                    "rounded-md py-1.5 transition",
                    mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="flex gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 translate-y-0.5" /> {notice}
              </div>
            )}

            {needsCode && (
              <Field label={mode === "reset" ? "Reset code" : "Verification code"} htmlFor="code">
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="text-center font-mono text-2xl tracking-[0.5em]"
                  required
                  autoFocus
                />
              </Field>
            )}
            {mode === "register" && (
              <Field label="Full name" htmlFor="name" hint="Shown as the sender name on your emails.">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" />
              </Field>
            )}
            {!needsCode && (
              <Field label="Email" htmlFor="email">
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </Field>
            )}
            {mode !== "verify" && mode !== "forgot" && (
              <Field
                label={mode === "reset" ? "New password" : "Password"}
                htmlFor="password"
                hint={mode === "login" ? undefined : PASSWORD_HINT}
              >
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={mode === "login" ? undefined : 8}
                  maxLength={72}
                  required
                />
              </Field>
            )}
            {mode === "login" && (
              <p className="-mt-2 text-right text-sm">
                <button type="button" onClick={() => switchMode("forgot")} className="font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot password?
                </button>
              </p>
            )}

            <Button type="submit" size="lg" loading={busy} className="w-full">
              {
                {
                  login: "Sign in",
                  register: "Create account",
                  verify: "Verify and continue",
                  forgot: "Email me a code",
                  reset: "Set password and sign in",
                }[mode]
              }
            </Button>

            {mode === "register" && (
              <p className="text-center text-xs text-slate-500">
                By creating an account you agree to the{" "}
                <Link href="/terms" className={legalLinkClass}>Terms</Link> and{" "}
                <Link href="/privacy" className={legalLinkClass}>Privacy Policy</Link>.
              </p>
            )}
            {needsCode && (
              <p className="text-center text-sm text-slate-500">
                Didn&apos;t get it?{" "}
                <button type="button" onClick={resend} disabled={busy} className="font-medium text-indigo-600 hover:text-indigo-500">
                  Resend code
                </button>
              </p>
            )}
          </form>
        </div>
        <footer className="mt-12 flex gap-4 text-xs text-slate-500">
          <Link href="/privacy" className={legalLinkClass}>Privacy</Link>
          <Link href="/terms" className={legalLinkClass}>Terms</Link>
        </footer>
      </main>
    </div>
  );
}
