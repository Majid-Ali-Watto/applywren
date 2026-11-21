# Applywren 📨

Applywren is a Next.js app for job seekers. Write a cover letter once, attach
your resume, and send every recruiter their own personalized email, with a
different letter or resume per role if you like. Then track each company's
application from *pending* to *accepted*.

- [How it works](#-how-it-works)
- [Getting started](#-getting-started)
- [Testing](#-testing)
- [Running in production](#-running-in-production)
- [Troubleshooting](#-troubleshooting)
- [Security](#-security)
- [Project structure](#-project-structure)

## ✨ How it works

The app has three tabs: **Compose**, **Applications** and **Documents**.

### Compose: three steps

1. **Recipients.** Import a sheet or paste addresses. Name and company are
   guessed from each address (`jane.doe@stripe.com` → Jane Doe, Stripe; generic
   inboxes like `hr@` and webmail domains are skipped). Check and edit everything
   in one table: guesses show in gray, and missing values are highlighted.
   Invalid addresses are skipped as you add them.
2. **Letter & resume.** Start from a template card (7 starters, your saved
   letters, or a blank page). A *Fill in the blanks* form replaces the
   `[bracketed]` parts, and *Insert a detail…* adds personal fields. Tick your
   resume from your saved files. A file named like a resume (or your only file)
   is ticked for you, and new uploads are saved to Documents for next time.
   Applying for several roles? Switch to **Different per role** to give a role
   its own letter and/or files (e.g. a portfolio for designers).
3. **Review & send.** One row per company shows exactly which letter, files and
   copies it gets, with a live preview. Anything still missing is listed with a
   **Fix** button that takes you to the right step.

After sending you can view the applications, retry failures, or start a new batch
that keeps your letter and resume.

### Recipient sheets

CSV, Excel (`.xlsx`/`.xls`) or JSON. The first row is the header, and only
`Email` is required:

| Column | Used for |
| --- | --- |
| `Email` | Who receives the email (required) |
| `Name`, `Company`, `Role` | `{{name}}`, `{{company}}`, `{{role}}`; `Role` also picks the letter when tailoring per role |
| `CC`, `BCC` | Copies for that email only; separate several addresses with `;` |
| anything else | Its own placeholder, e.g. `Hiring Manager` → `{{hiring_manager}}` |

JSON can be a list of addresses (`["a@x.com"]`) or of objects with an `email`
key. See [`samples/`](samples/) for examples, or download the example file from
the Recipients step.

### Personalization

| Placeholder | Filled with |
| --- | --- |
| `{{name}}`, `{{company}}`, `{{role}}`, `{{email}}`, any sheet column | The recipient's values |
| `{{my_name}}`, `{{my_email}}`, `{{my_phone}}`, `{{my_link}}` | **Your details** (see below) |
| `{{name\|Hiring Manager}}` | The value, or the text after `\|` when it's empty |

Sending is blocked while a recipient lacks a value their letter needs, or while
`[bracketed]` template text is left.

### Your details

Open the profile button in the header to set your name, phone and LinkedIn or
portfolio link. They fill the `{{my_*}}` placeholders, and your name is the
sender name on every email. If you leave the name empty it's guessed from your
email (`majid.ali@…` → Majid Ali). A link typed without `https://` gets it added.

### Sending from your own email

Applications are sent **from your own address**, through your own mailbox, so
they land in your Sent folder and replies come straight back to you. Connect it
once under **Send from your email** in your profile:

1. Create an *app password* with your email provider (the profile links to the
   right page). An app password is a separate password for one app; it needs
   2-step verification turned on, and your normal password is never used.
2. Paste it and press **Connect**. The app signs in to check it before saving.

The mail server is filled in for Gmail, Google Workspace, Yahoo, iCloud, Zoho,
AOL, GMX and Fastmail, including company domains hosted by them (found through
the domain's MX records). For other providers, enter their SMTP server and port
(465 or 587). Microsoft (Outlook, Microsoft 365) usually blocks app-password
sign-in, so use another account there.

App passwords are stored encrypted (AES-256-GCM, key from `MAILBOX_SECRET`) and
are never sent back to the browser. **Disconnect** deletes the saved one; you can
also revoke it at your provider at any time.

Locally, while `SMTP_HOST` is set, every email goes to Mailpit instead, from
your address, and connecting is optional.

### CC and BCC

Copies belong to a company, not to the whole batch. For example, CC the hiring
manager or your referrer only on the email to that company. Set them with
**CC/BCC** on a company's row in *Review & send*, or with `CC`/`BCC` sheet
columns.

There is no global CC, because every company would see the same copied
address. The one global option is **Send me a copy of every email**, which BCCs
your own address, so a copy of each email also lands in your inbox.

### Your account

Sign-in uses a secure cookie that lasts 24 hours. **Forgot password?** on the
sign-in screen emails a reset code. In your profile you can change your password
(this signs out your other devices) or delete your account and all its data.
The [Privacy Policy](/privacy) and [Terms of Service](/terms) are linked from
the sign-in screen and your profile.

### Applications and Documents

- **Applications:** one entry per company and role, each with its own status
  (pending, interviewing, rejected, accepted). Status cards filter the list, and
  you can search by company, role, subject or email. Expand a row to see each
  recipient's result, the letter as sent, and the attachments.
- **Documents:** PDF resumes (stored once per content) with preview,
  cover-letter templates with a rich-text editor and PDF export, and the
  starter templates to customize. Deleting a file that a past application used
  hides it but keeps it for that application's history.

### Limits

| Limit | Value |
| --- | --- |
| Recipients per send | 25 |
| Recipients per user per 24 hours | 100 |
| CC / BCC addresses | 10 each, per email |
| Attachments per email | 5 PDFs, 10 MB each, 15 MB total |
| Per send | 10 different letters, 10 different files, 30 MB of files |

Mail goes out one email about every second. Your provider has its own daily
limits too (a personal Gmail account allows roughly 500 recipients a day).

## 🚀 Getting started

### Prerequisites

- Node.js 18.18 or newer
- Docker, for MongoDB, a local mail catcher and a database browser

### Local development

```bash
cp .env.example .env   # set JWT_SECRET and MONGO_EXPRESS_PASSWORD
docker compose up -d
npm install
npm run dev            # http://localhost:3000
```

| Service | URL | Purpose |
| --- | --- | --- |
| MongoDB | `mongodb://localhost:27017` | Database `bulk-applier` |
| Mailpit | http://localhost:8025 | Catches all outgoing mail, including verification codes |
| mongo-express | http://localhost:8081 | Browse and edit the database (login from `.env`) |

The services listen on `127.0.0.1` only. To try the app, create an account
(the code arrives in Mailpit) and import
[`samples/recipients-mixed-roles.csv`](samples/recipients-mixed-roles.csv).
Sample addresses use reserved domains, so they can never reach a real inbox.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` | Unit, middleware, hook and component tests |
| `npm run test:integration` | API tests against MongoDB |
| `npm run test:watch` | Re-run unit tests on change |
| `npm run lint` | ESLint |

### Environment

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Random secret for signing sessions, at least 32 characters (`openssl rand -hex 32`). Changing it signs everyone out |
| `SITE_URL` | Public address of the app, e.g. `https://applywren.com`; used for link previews, `robots.txt` and the sitemap |
| `CONTACT_EMAIL` | Address shown on `/privacy` and `/terms` for privacy and legal questions. Required before going live |
| `MAILBOX_SECRET` | Long random secret that encrypts users' app passwords. Changing it means everyone reconnects their email |
| `FROM` | The app's own address, used only for verification codes |
| `GMAIL_PASS` | Gmail [app password](https://support.google.com/accounts/answer/185833) for `FROM`, used when `SMTP_HOST` is unset |
| `SMTP_HOST`, `SMTP_PORT` | Local mail catcher (Mailpit). While set, **all** mail goes there, and connecting an email is optional. Remove both in production |
| `MONGO_EXPRESS_USER`, `MONGO_EXPRESS_PASSWORD` | mongo-express login |

### Viewing local data

Open mongo-express at http://localhost:8081, or use the shell:

```bash
docker compose exec mongo mongosh bulk-applier
db.applications.find({}, { company: 1, role: 1, status: 1 })
db.documents.find({}, { content: 0 })   // leave out the PDF contents
```

`docker compose down` stops the services and keeps your data;
`docker compose down -v` also deletes it.

## 🧪 Testing

```bash
npm test                  # no services needed
npm run test:integration  # needs `docker compose up -d`
```

All tests live in `tests/`:

- **`tests/unit/`** (Vitest, Testing Library, jsdom): templates, auto-fill
  guesses, grouping, the send payload, middleware token checks, the Compose
  logic (`useCompose`) and the recipient input.
- **`tests/integration/`**: the real API route handlers against the
  `bulk-applier-test` database, with outgoing mail captured in memory. They cover
  sign-up, verification, password reset and change, account takeover and
  enumeration protection, rate limits, account deletion, ownership checks, documents,
  connecting a mailbox, multi-letter sends from the user's own mailbox with
  per-company copies, profile and status updates. DNS is mocked too.
  - The database is wiped before each test, and the suite refuses any database
    whose name doesn't end in `-test`.
  - Use another database with `TEST_MONGODB_URI`.

## 🌐 Running in production

1. Use a hosted MongoDB (e.g. Atlas) for `MONGODB_URI` and a long random
   `JWT_SECRET`.
2. Set `SITE_URL` to the app's public address so link previews and the sitemap
   point to it, and `CONTACT_EMAIL` for the Privacy Policy and Terms. Review
   both pages with someone who knows the law where you operate: add your legal
   name, country and governing law, and list your actual hosting and database
   providers.
3. Serve it over **HTTPS only**, behind a proxy that sets the client's IP:
   Vercel does this itself; with nginx use
   `proxy_set_header X-Real-IP $remote_addr;`. Per-IP rate limits rely on it.
   Without it, all visitors share one limit. Use a MongoDB with authentication
   (Atlas does this by default), and don't expose the local Docker services.
4. Send real mail: remove `SMTP_HOST`/`SMTP_PORT` and set a long random
   `MAILBOX_SECRET`. Applications then go out through each user's own
   connected mailbox. Verification codes go out from `FROM`, a Gmail address,
   with `GMAIL_PASS`, its app password.
5. Run `npm run build && npm start`, or deploy to a Node host such as Vercel.
   Sending allows up to 5 minutes per request (`maxDuration`).

## 🛠 Troubleshooting

- **No verification code arrives.** Locally, all mail goes to Mailpit
  (http://localhost:8025). A new code can be requested once a minute.
- **The dev server shows 500 errors or missing chunks after a build.**
  `npm run build` and `npm run dev` share `.next`. Stop the dev server, run
  `rm -rf .next`, and start it again. Don't build while the dev server runs.
- **Connecting your email fails.**
  - *Rejected the app password:* paste an app password, not your normal
    password, and check that 2-step verification is on.
  - *Couldn't connect:* check the server and port with your provider. Some
    networks block ports 465 and 587.
- **"Cross-site request blocked" (403) from `curl`.** State-changing API calls
  need a same-origin `Origin` header, e.g.
  `-H "Origin: http://localhost:3000"`, plus the session cookie
  (`-c`/`-b cookies.txt`).
- **Signed out after updating.** Sessions moved to a cookie, so sign in once more.
- **"JWT_SECRET must be set to at least 32 random characters".** Generate one with
  `openssl rand -hex 32`. Placeholder values like `change-me…` are refused. The
  same goes for `MAILBOX_SECRET`.
- **Signing out on one device signed me out everywhere.** That's intended: it
  makes sure a copied session can't be reused.
- **Sends fail with "rejected the app password".** The app password was revoked
  or changed. Reconnect your email in your profile.
- **A saved field (e.g. phone) disappears.** Models are rebuilt on hot reload,
  so a schema change applies without a restart. If it still happens, restart
  `npm run dev`.
- **Integration tests can't connect.** Start the services with
  `docker compose up -d`.

## 🔒 Security

**Sessions and requests**
- Sessions are signed JWTs (HS256, `jose`, issuer and audience checked) in an
  `HttpOnly`, `SameSite=Lax` cookie, which is also `Secure` and named
  `__Host-session` in production. Page scripts can't read it.
- Sessions last 24 hours. Signing out, changing a password or resetting it ends
  every session, so a copied cookie stops working.
- Every `/api` route except sign-in, sign-up, verification, password reset and
  logout needs a valid session. The middleware checks it, and each route verifies
  the cookie again itself, so a middleware bypass wouldn't expose data. Every
  lookup is scoped to its owner.
- Cross-site requests that change data are refused (`Sec-Fetch-Site`/`Origin`
  check), on top of the SameSite cookie.

**Passwords and codes**
- Passwords are hashed with bcrypt (cost 12) and must be 8–72 characters;
  longer ones are refused rather than silently cut. Common passwords and
  passwords containing the email name are refused.
- Verification and reset codes are random, stored as a keyed hash (HMAC), and
  expire in 30 minutes. Each allows 5 attempts. Codes are sent at most once a
  minute, and each address gets at most 5 an hour and 20 a day.

**Account protection**
- Verifying a new account needs its sign-up password too, so someone who
  re-registers an unverified address can't take it over.
- Nothing reveals whether an address has an account:
  - sign-up, password reset and lockouts answer the same either way;
  - emails that only real accounts trigger are sent after the response, so
    timing doesn't give it away either;
  - the owner gets at most one "someone tried to sign up" email a day.
- Email addresses match regardless of case.

**Rate limits**
- Limits are stored in MongoDB with atomic counters, so they hold across server
  instances and parallel requests.
- Sign-in:
  - 20 attempts per IP per 15 minutes;
  - 5 per email and IP per 15 minutes, which locks out guessing from one place
    without locking the owner out from theirs;
  - 30 per email per hour from anywhere;
  - a password reset lifts these.
- Sign-up: 10 per IP per hour. Code checks: 30 per IP per 15 minutes. Reset
  requests: 10 per IP per hour. Password checks and mail-server sign-ins: 10 per
  user per hour.

**Abuse and resource limits**
- Request bodies are capped: 64 KB by default, 16 MB for documents, 48 MB for
  sends.
- Each account can store at most 50 files, 100 cover letters and 150 MB, and
  sends count toward that.
- One send runs at a time per account, so parallel requests can't get past the
  daily limit.
- Template matching runs in linear time, even on hostile 500k-character input.
- Spreadsheet imports are limited to 5 MB, 1,000 rows and 50 columns, so a tiny
  file that claims billions of cells can't freeze the tab.

**Browser protections**
- Pages get a strict Content-Security-Policy with a fresh script nonce per
  request (`'strict-dynamic'`, no inline or external scripts).
- Other headers: HSTS in production, `X-Frame-Options: DENY`, `nosniff`,
  Referrer-Policy, Permissions-Policy and COOP. API responses are `no-store`.
- Stored HTML is sanitized with DOMPurify wherever it's rendered.

**Data and mail**
- Every request body is validated on the server: addresses (header injection is
  rejected), sizes, PDF signature, allowed fields, and profile links
  (http/https only).
- Your details (`{{my_*}}`) always come from your account, never from the request.
- Mail is sent only from your own, verified account address.
- App passwords are checked by signing in before they're saved, encrypted
  (AES-256-GCM), and never returned to the browser.
- The app only connects to public mail servers on ports 465 or 587, so a custom
  server can't point it at internal machines (private, loopback, NAT64 and 6to4
  addresses are refused).
- Secrets must be at least 32 random characters, and placeholder values are
  refused at startup.
- Users can delete their account and all its data from their profile.

## Known limitations

- Connecting your email needs an app password. Microsoft accounts and providers
  without app passwords can't connect yet (that would need "Sign in with
  Google/Microsoft"). Replies aren't detected automatically.
- The subject line is shared by all roles; use `{{role}}` to vary it.
- Company and name guesses are best-effort (`ibm.com` → "Ibm"); fix them in the
  table.
- Known advisories remain in Next.js 15 (fixed only in 16) and in SheetJS
  (`xlsx`, no fixed version on npm). Spreadsheets are only parsed in your own
  browser.

## 🗂 Project structure

```
src/
  app/              page.js (app shell) and api/* route handlers
  components/       UI; compose/ holds the 3-step Compose flow and its logic hook
  lib/              shared and server logic: auth, validation, templates, auto-fill, limits, mail
  models/           Mongoose models (User, Document, Application)
  utils/            browser helpers: API client, session, files, sanitizing
  middleware.js     token check for /api
tests/
  unit/             unit, middleware, hook and component tests
  integration/      API route tests (MongoDB)
samples/            example recipient sheets
```

## 🛠 Tech stack

Next.js 15 (App Router, route handlers, middleware), React 18, Tailwind CSS 4,
Quill, MongoDB with Mongoose, Nodemailer, jose, bcryptjs, DOMPurify, SheetJS,
html2pdf.js, lucide-react. Tests: Vitest, Testing Library, jsdom.

## 🤖 AI assistants

[`AGENTS.md`](AGENTS.md) describes the architecture, conventions and pitfalls for
AI coding agents, and [`CLAUDE.md`](CLAUDE.md) adds Claude Code specifics.
