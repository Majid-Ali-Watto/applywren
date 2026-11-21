import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "@/lib/site";
import { Logo } from "./Logo";

/** Contact address as a link, or a visible reminder to configure it. */
export function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  ) : (
    <mark>[set CONTACT_EMAIL]</mark>
  );
}

/** Shared layout for the Privacy Policy and Terms of Service. */
export default function LegalPage({ title, intro, children }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label={`${SITE_NAME} home`}>
            <Logo />
          </Link>
          <nav className="flex gap-4 text-sm text-slate-500">
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-6 text-base leading-relaxed text-slate-700">{intro}</p>
        <div className="legal mt-8">{children}</div>
      </main>
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-slate-500 sm:px-6">
          <span>© {new Date().getFullYear()} {SITE_NAME}</span>
          <Link href="/privacy" className="hover:text-slate-900">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-900">Terms of Service</Link>
          <Link href="/" className="hover:text-slate-900">Open the app</Link>
        </div>
      </footer>
    </div>
  );
}
