"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, ExternalLink } from "lucide-react";
import { apiFetch } from "@/utils/api";
import { senderFields } from "@/lib/autofill";
import { useToast } from "./Toast";
import { SMTP_PORTS } from "@/lib/mailProviders";
import { Button, Field, Input, Modal, cx, inputClass } from "./ui";

/**
 * Edits the sender details that fill {{my_name}}, {{my_phone}} and {{my_link}},
 * and connects the mailbox applications are sent from.
 */
export default function ProfileModal({ open, profile, onClose, onSaved, onSignedOut }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", phone: "", link: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: profile?.name ?? "", phone: profile?.phone ?? "", link: profile?.link ?? "" });
      setError("");
    }
  }, [open, profile]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      onSaved(await apiFetch("/api/me", { method: "PUT", body: form }));
      toast("Profile saved");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const guessedName = senderFields({ email: profile?.email }).my_name;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your details"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="profile-form" loading={saving}>Save</Button>
        </>
      }
    >
      <form id="profile-form" onSubmit={save} className="space-y-4">
        <p className="text-sm text-slate-500">
          These fill <code className="text-indigo-600">{"{{my_name}}"}</code>,{" "}
          <code className="text-indigo-600">{"{{my_phone}}"}</code> and{" "}
          <code className="text-indigo-600">{"{{my_link}}"}</code> in your letters. Your name is also the sender name.
        </p>
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <Field label="Email" hint="Applications are sent from this address, and replies come back to it.">
          <Input value={profile?.email ?? ""} disabled />
        </Field>
        <Field label="Full name" htmlFor="profile-name" hint={form.name ? undefined : `Leave empty to use "${guessedName}".`}>
          <Input id="profile-name" value={form.name} onChange={set("name")} maxLength={100} placeholder={guessedName} autoComplete="name" />
        </Field>
        <Field label="Phone" htmlFor="profile-phone">
          <Input id="profile-phone" value={form.phone} onChange={set("phone")} maxLength={40} placeholder="+1 555 123 4567" autoComplete="tel" />
        </Field>
        <Field label="LinkedIn or portfolio" htmlFor="profile-link" hint="https:// is added for you if you leave it out.">
          <Input
            id="profile-link"
            inputMode="url"
            value={form.link}
            onChange={set("link")}
            maxLength={200}
            placeholder="linkedin.com/in/you"
            autoComplete="url"
          />
        </Field>
      </form>
      {open && profile?.mailbox && <MailboxSection key={String(profile.mailbox.connected)} profile={profile} onSaved={onSaved} />}
      {open && <AccountSection email={profile?.email} onSignedOut={onSignedOut} />}
      <p className="mt-6 flex gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <Link href="/privacy" className="hover:text-slate-800 hover:underline">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-slate-800 hover:underline">Terms of Service</Link>
      </p>
    </Modal>
  );
}

/** Connects the user's own mailbox with an app password, so mail is sent from their address. */
function MailboxSection({ profile, onSaved }) {
  const toast = useToast();
  const { mailbox, testMode } = profile;
  const suggested = mailbox.suggested;
  const [password, setPassword] = useState("");
  const [server, setServer] = useState({ host: suggested?.host ?? "", port: suggested?.port ?? 465 });
  const [editingServer, setEditingServer] = useState(!suggested);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (request, message) => {
    setBusy(true);
    setError("");
    try {
      onSaved(await request());
      setPassword("");
      toast(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const connect = (e) => {
    e.preventDefault();
    const body = editingServer ? { password, host: server.host, port: Number(server.port) } : { password };
    run(() => apiFetch("/api/me/mailbox", { method: "PUT", body }), "Email connected");
  };
  const disconnect = () => run(() => apiFetch("/api/me/mailbox", { method: "DELETE" }), "Email disconnected");

  return (
    <section className="mt-6 space-y-3 border-t border-slate-100 pt-5" aria-labelledby="mailbox-title">
      <h3 id="mailbox-title" className="text-sm font-semibold text-slate-900">Send from your email</h3>
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {mailbox.connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <span className="flex min-w-0 items-center gap-2">
            <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0">
              Connected through <span className="font-medium">{mailbox.host}</span>. Sent emails also appear in your Sent folder.
            </span>
          </span>
          <Button size="sm" variant="danger" onClick={disconnect} loading={busy}>Disconnect</Button>
        </div>
      ) : (
        <form onSubmit={connect} className="space-y-3">
          <p className="text-sm text-slate-500">
            Connect your email once with an <span className="font-medium text-slate-700">app password</span>, a
            separate password your email provider creates for apps like this one. Your normal password is never needed.
          </p>
          {suggested && (
            <p className="text-sm text-slate-600">
              {suggested.name} detected.{" "}
              {suggested.help && (
                <a
                  href={suggested.help}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Create an app password <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </p>
          )}
          {suggested?.note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{suggested.note}</p>}
          <Field label="App password" htmlFor="mailbox-password">
            <Input
              id="mailbox-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={200}
              autoComplete="off"
              placeholder="xxxx xxxx xxxx xxxx"
              required
            />
          </Field>
          {editingServer ? (
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
              <Field label="Mail server (SMTP)" htmlFor="mailbox-host" hint={suggested ? undefined : "Your provider's help pages list it."}>
                <Input
                  id="mailbox-host"
                  value={server.host}
                  onChange={(e) => setServer({ ...server, host: e.target.value })}
                  placeholder="smtp.example.com"
                  maxLength={253}
                  required
                />
              </Field>
              <Field label="Port" htmlFor="mailbox-port">
                <select
                  id="mailbox-port"
                  value={server.port}
                  onChange={(e) => setServer({ ...server, port: Number(e.target.value) })}
                  className={cx(inputClass, "h-[38px]")}
                >
                  {SMTP_PORTS.map((port) => <option key={port} value={port}>{port}</option>)}
                </select>
              </Field>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingServer(true)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Using {suggested.host}:{suggested.port} · Change
            </button>
          )}
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={busy}>Connect</Button>
          </div>
        </form>
      )}
      {testMode && (
        <p className="text-xs text-slate-500">
          Local testing: every email is caught by the mail catcher (Mailpit), so connecting is optional.
        </p>
      )}
    </section>
  );
}

/** Change password (signs out other devices) and delete the account. */
function AccountSection({ email, onSignedOut }) {
  const toast = useToast();
  const [open, setOpen] = useState(null); // "password" | "delete" | null
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toggle = (name) => {
    setOpen(open === name ? null : name);
    setError("");
    setForm({ currentPassword: "", newPassword: "", password: "", confirm: "" });
  };

  const submit = (action) => async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const changePassword = submit(async () => {
    const { currentPassword, newPassword } = form;
    await apiFetch("/api/me/password", { method: "PUT", body: { currentPassword, newPassword } });
    toast("Password changed. Other devices are signed out.");
    toggle(null);
  });
  const deleteAccount = submit(async () => {
    await apiFetch("/api/me", { method: "DELETE", body: { password: form.password } });
    toast("Your account and all its data were deleted.");
    onSignedOut();
  });

  return (
    <section className="mt-6 space-y-3 border-t border-slate-100 pt-5" aria-labelledby="account-title">
      <h3 id="account-title" className="text-sm font-semibold text-slate-900">Account</h3>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => toggle("password")} aria-expanded={open === "password"}>
          Change password
        </Button>
        <Button size="sm" variant="danger" onClick={() => toggle("delete")} aria-expanded={open === "delete"}>
          Delete account
        </Button>
      </div>
      {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {open === "password" && (
        <form onSubmit={changePassword} className="space-y-3">
          <input type="email" value={email ?? ""} autoComplete="username" readOnly hidden />
          <Field label="Current password" htmlFor="current-password">
            <Input id="current-password" type="password" value={form.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" required />
          </Field>
          <Field label="New password" htmlFor="new-password" hint="At least 8 characters. Other devices will be signed out.">
            <Input id="new-password" type="password" value={form.newPassword} onChange={set("newPassword")} autoComplete="new-password" minLength={8} maxLength={72} required />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={busy}>Change password</Button>
          </div>
        </form>
      )}

      {open === "delete" && (
        <form onSubmit={deleteAccount} className="space-y-3 rounded-lg bg-red-50/60 p-3">
          <p className="text-sm text-red-800">
            This permanently deletes your account, resumes, cover letters, application history and saved email
            connection. It can&apos;t be undone.
          </p>
          <Field label="Password" htmlFor="delete-password">
            <Input id="delete-password" type="password" value={form.password} onChange={set("password")} autoComplete="current-password" required />
          </Field>
          <Field label='Type "delete" to confirm' htmlFor="delete-confirm">
            <Input id="delete-confirm" value={form.confirm} onChange={set("confirm")} autoComplete="off" required />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="danger" loading={busy} disabled={form.confirm.trim().toLowerCase() !== "delete"}>
              Delete my account
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

