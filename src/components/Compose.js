"use client";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, RotateCcw, Send, XCircle } from "lucide-react";
import { useCompose, plural } from "./compose/useCompose";
import StepRecipients from "./compose/StepRecipients";
import StepLetter from "./compose/StepLetter";
import StepReview from "./compose/StepReview";
import { useToast } from "./Toast";
import { Button, Card, cx } from "./ui";

const STEPS = [
  { n: 1, label: "Recipients", hint: "Who are you applying to?" },
  { n: 2, label: "Letter & resume", hint: "What will they receive?" },
  { n: 3, label: "Review & send", hint: "Check each email, then send." },
];

/** Three-step flow: recipients, then letter and resume, then review and send. */
export default function Compose({ active, profile, onEditProfile, onViewApplications }) {
  const toast = useToast();
  const m = useCompose({ active, profile, toast });

  if (m.result) return <SendResult m={m} onViewApplications={onViewApplications} />;

  const canContinue = m.step === 1 ? m.emails.length > 0 : true;
  const stepIssues = m.issuesFor(m.step);

  return (
    <div className="space-y-6 pb-24">
      <Stepper m={m} />

      {m.step === 1 && <StepRecipients m={m} />}
      {m.step === 2 && <StepLetter m={m} onEditProfile={onEditProfile} />}
      {m.step === 3 && <StepReview m={m} onEditProfile={onEditProfile} />}

      {active && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            {m.step > 1 ? (
              <Button variant="secondary" onClick={() => m.setStep(m.step - 1)}>
                <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
              </Button>
            ) : (
              <span />
            )}
            <p className="min-w-0 flex-1 truncate text-sm text-slate-500">
              {m.step === 3
                ? m.ready
                  ? `Ready: ${plural(m.emails.length, "email")} to ${plural(m.companies.length, "company", "companies")}`
                  : `${plural(m.issues.length, "thing")} to fix first`
                : stepIssues[0]?.text ?? STEPS[m.step - 1].hint}
            </p>
            {m.step < 3 ? (
              <Button onClick={() => m.setStep(m.step + 1)} disabled={!canContinue}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={m.send} disabled={!m.ready} loading={m.sending}>
                {m.sending ? `Sending… about ${m.emails.length}s` : <><Send className="h-4 w-4" /> Send {plural(m.emails.length, "email")}</>}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ m }) {
  return (
    <nav aria-label="Steps">
      <ol className="grid grid-cols-3 gap-2 sm:gap-4">
        {STEPS.map(({ n, label }) => {
          const done = n < m.step && m.issuesFor(n).length === 0;
          const current = n === m.step;
          return (
            <li key={n}>
              <button
                onClick={() => (n === 1 || m.emails.length > 0) && m.setStep(n)}
                aria-current={current ? "step" : undefined}
                className={cx(
                  "flex w-full items-center gap-2 border-t-4 pt-3 text-left transition",
                  current ? "border-indigo-600" : done ? "border-indigo-300" : "border-slate-200"
                )}
              >
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    current ? "bg-indigo-600 text-white" : done ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : n}
                </span>
                <span className={cx("truncate text-sm font-medium", current ? "text-slate-900" : "text-slate-500")}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SendResult({ m, onViewApplications }) {
  const { sent, failed } = m.result;
  const allSent = failed.length === 0;
  return (
    <Card className="mx-auto max-w-xl">
      <div className="py-6 text-center">
        {allSent ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-amber-500" />
        )}
        <h2 className="mt-4 text-xl font-semibold text-slate-900">
          {allSent ? `Sent ${plural(sent, "application")}!` : `Sent ${sent} of ${sent + failed.length}`}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {sent > 0 ? "You can track each one in Applications." : "Nothing was sent."}
        </p>
        {failed.length > 0 && (
          <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-sm">
            {failed.map((r) => (
              <li key={r.email} className="rounded-md bg-red-50 px-3 py-2 text-red-800">
                <span className="font-medium">{r.email}</span>: {r.error}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {failed.length > 0 && (
            <Button onClick={() => m.closeResult({ fresh: false })}>
              <RotateCcw className="h-4 w-4" /> Retry failed
            </Button>
          )}
          {sent > 0 && (
            <Button variant={failed.length ? "secondary" : "primary"} onClick={onViewApplications}>
              View applications
            </Button>
          )}
          <Button variant="secondary" onClick={() => m.closeResult({ fresh: true })}>
            Start a new batch
          </Button>
        </div>
      </div>
    </Card>
  );
}
