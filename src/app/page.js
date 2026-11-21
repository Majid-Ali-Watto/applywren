"use client";

import { useEffect, useState } from "react";
import { Briefcase, CircleUserRound, FolderOpen, LogOut, SquarePen } from "lucide-react";
import Login from "@/components/Login";
import Compose from "@/components/Compose";
import Applications from "@/components/Applications";
import Documents from "@/components/Documents";
import ProfileModal from "@/components/ProfileModal";
import { Logo } from "@/components/Logo";
import { ToastProvider } from "@/components/Toast";
import { Button, Spinner, cx } from "@/components/ui";
import { apiFetch, SESSION_ENDED } from "@/utils/api";

const TABS = [
  {
    id: "compose",
    label: "Compose",
    icon: SquarePen,
    title: "New application",
    description: "Write once, and every company gets its own personalized email.",
  },
  {
    id: "applications",
    label: "Applications",
    icon: Briefcase,
    title: "Applications",
    description: "Every company you applied to, and where each one stands.",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FolderOpen,
    title: "Documents",
    description: "Resumes and cover letter templates you can reuse.",
  },
];

export default function Home() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

function App() {
  // undefined while checking the session cookie, null when signed out.
  // Also fills the {{my_*}} placeholders.
  const [profile, setProfile] = useState(undefined);
  const [tab, setTab] = useState("compose");
  const [editingProfile, setEditingProfile] = useState(false);

  const loadProfile = () =>
    apiFetch("/api/me")
      .then(setProfile)
      .catch(() => setProfile(null));

  useEffect(() => {
    loadProfile();
    const signedOut = () => {
      setProfile(null);
      setEditingProfile(false);
    };
    window.addEventListener(SESSION_ENDED, signedOut);
    const syncTab = () => {
      const id = window.location.hash.slice(1);
      setTab(TABS.some((t) => t.id === id) ? id : "compose");
    };
    syncTab();
    window.addEventListener("hashchange", syncTab);
    return () => {
      window.removeEventListener("hashchange", syncTab);
      window.removeEventListener(SESSION_ENDED, signedOut);
    };
  }, []);

  const go = (id) => {
    window.location.hash = id;
  };

  const signOut = async () => {
    await apiFetch("/api/logout", { method: "POST" }).catch(() => {});
    setProfile(null);
    history.replaceState(null, "", window.location.pathname);
  };

  if (profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!profile) return <Login onSignedIn={loadProfile} />;

  const current = TABS.find((t) => t.id === tab);

  const navButton = ({ id, label, icon: Icon }, mobile) => (
    <button
      key={id}
      onClick={() => go(id)}
      aria-current={tab === id ? "page" : undefined}
      className={cx(
        "inline-flex items-center gap-2 text-sm font-medium transition",
        mobile
          ? cx("flex-1 justify-center border-b-2 py-2.5", tab === id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500")
          : cx("rounded-lg px-3 py-1.5", tab === id ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900")
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">{TABS.map((t) => navButton(t, false))}</nav>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)} title="Your details">
              <CircleUserRound className="h-4 w-4" />
              <span className="hidden max-w-[14rem] truncate sm:inline">{profile.name || profile.email}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
        <nav className="flex border-t border-slate-100 md:hidden">{TABS.map((t) => navButton(t, true))}</nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{current.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{current.description}</p>
        </div>

        {/* Compose stays mounted so a draft survives switching tabs. */}
        <div hidden={tab !== "compose"}>
          <Compose
            active={tab === "compose"}
            profile={profile}
            onEditProfile={() => setEditingProfile(true)}
            onViewApplications={() => go("applications")}
          />
        </div>
        {tab === "applications" && <Applications onCompose={() => go("compose")} />}
        {tab === "documents" && <Documents />}
      </main>

      <ProfileModal
        open={editingProfile}
        profile={profile}
        onClose={() => setEditingProfile(false)}
        onSaved={setProfile}
        onSignedOut={() => {
          setEditingProfile(false);
          setProfile(null);
        }}
      />
    </div>
  );
}
