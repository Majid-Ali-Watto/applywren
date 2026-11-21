# AGENTS.md

Guidance for AI coding agents working in this repository. Read the README for
what the product does; this file is about how the code is put together and what
to be careful with.

The product is called **Applywren**, and so is the GitHub repository
(`Majid-Ali-Watto/applywren`). Some internal identifiers deliberately keep the
old names: the `bulk-applier` package, the `bulk-applier` / `bulk-applier-test`
databases, the local `bulk-email-sender` folder, and the Docker volume
`bulk-email-sender_mongo-data`. Don't rename them as a side effect; the
database and volume hold existing data.
The visible name, tagline and description live in `src/lib/site.js`, which
feeds the page metadata, the share image (`app/opengraph-image.js`),
`robots.js`, `sitemap.js` and `manifest.js`. The icons are `app/icon.svg`,
`favicon.ico` and `apple-icon.png`; regenerate the last two if the SVG changes.

## Commands

```bash
docker compose up -d       # MongoDB :27017, Mailpit :8025 (SMTP :1025), mongo-express :8081
npm run dev                # Next.js dev server (Turbopack) on :3000
npm test                   # Vitest: unit, middleware, hook, component tests (no services)
npm run test:integration   # Vitest: API route handlers against MongoDB (needs docker compose)
npm run lint               # next lint
```

`npm run build` writes to `.next`, the same folder `npm run dev` uses. **Never
build in the working copy while a dev server is running.** It breaks the dev
server (500s, missing Turbopack chunks). Build in a separate copy, or ask first.

## Architecture

**Request flow.** `src/middleware.js` runs for pages and `/api/*`:
- **Pages:** it creates a per-request nonce and sets a strict Content-Security-Policy
  (`lib/csp.js`): scripts need the nonce plus `'strict-dynamic'`, and there are no
  external sources. The nonce is passed on as `x-nonce`; Next.js adds it to its own
  scripts, and `app/layout.js` reads it for the JSON-LD script. This is why every
  page renders dynamically (`ƒ`).
- **API:**
  1. It refuses cross-site POST/PUT/DELETE with a 403 (`Sec-Fetch-Site`, else
     `Origin` vs `Host`).
  2. For non-public routes, it turns away requests without a valid session JWT
     (HttpOnly cookie; `lib/auth.js`: HS256, issuer/audience, `sub` = user id,
     `sv` = session version).

Public routes are login, register, verify, password-reset (+`/confirm`) and logout.
Route handlers get the user only through `await currentUserId(req)`
(`lib/accounts.js`). It verifies the cookie **itself**, so routes stay safe even
if middleware were bypassed (Next.js has had such advisories). It also checks
that the user still exists and that `sv` matches `sessionVersion`; otherwise it
throws a 401. Never trust `x-user-*` style headers.

**Accounts** (`lib/accounts.js`, `lib/rateLimit.js`):
- Sign-in uses `signedIn(user)`, which sets the cookie; `signedOut()` clears it.
- Emails are normalized with `normalizeEmail`. Look accounts up with
  `findUserByEmail`, which is case-insensitive for older mixed-case rows.
- One-time codes share the `verificationCode*` fields. `consumeCode` counts the
  attempt atomically, then compares.
- Verifying a new account requires its password (this prevents pre-registration
  takeover).
- Sign-out, password reset and password change bump `sessionVersion`. That ends
  every session, so a copied cookie stops working.
- New passwords must pass `lib/validate.js#passwordProblem`.
- Codes are stored as an HMAC (`lib/mailer.js#hashCode`, keyed from `JWT_SECRET`).
  They expire in 30 minutes, allow 5 attempts, are sent at most once a minute,
  and each address gets at most 5 an hour and 20 a day.
- Wrap anything an attacker could repeat in `rateLimit(name, subject)` (it counts
  first, then throws a 429), with limits defined in `LIMITS`. Counters are
  fixed-window documents in the `ratelimits` TTL collection, updated with a
  single atomic upsert, so parallel requests can't slip through.
  - `clientIp` uses `X-Real-IP`, otherwise the **last** `X-Forwarded-For` hop.
  - Sign-in counts each attempt before checking the password: 5 per email+IP and
    30 per email per hour, cleared on success or reset. Unknown emails count the
    same way.
- Responses must not reveal whether an account exists. Register always hashes
  the password and answers `{ ok: true }`. Emails that only some paths send go
  out after the response (`lib/http.js#afterResponse`). The "you already have an
  account" notice has its own budget of one a day.
- Secrets come through `lib/auth.js#requireSecret`, which refuses missing,
  short or placeholder values.

**Route handler pattern** (`src/app/api/**/route.js`):

```js
try {
  await connectDB();
  const body = await readJson(req);             // lib/http: bad JSON -> 400
  assert(condition, "User-facing message");     // lib/validate: ValidationError -> 400
  const doc = await Model.findOne({ _id, userId: await currentUserId(req) }); // always scope by owner
  return Response.json(doc);
} catch (error) {
  return errorResponse(error, "Context");       // 400 for ValidationError, generic 500 otherwise
}
```

Use `isValidObjectId` before querying by id (invalid ids are 404, not 500).

**Models** (`src/models/`) are created with `defineModel(name, schema)`, which
replaces a cached model in development. Without it, hot reload keeps the old
schema and Mongoose silently drops new fields.
- `User`: credentials (`email` stored lower-case), verification fields,
  `sessionVersion` (in every token; bump to end all sessions), `sendingUntil`
  (set while a send runs), `name`/`phone`/`link`
  (profile), and `mailbox` (`host`, `port`, `passwordEncrypted` with
  `select: false`): the user's own SMTP account that applications are sent from.
- `Document`: `type: "file" | "coverLetter"`. Files are base64 PDFs, deduplicated
  per user by sha256 `hash`. `archived: true` hides a file from the library but
  keeps it for application history (set when a sent file wasn't in the library,
  or when a file used by an application is deleted).
- `Application`: one per company + role (+ letter) per send, with `recipients[]`
  (`email`, `fields`, `status: sent|failed`, `error`), `subject`/`coverLetter`
  templates (sender fields already filled), `resumeIds`, and `status`
  (`models/applicationStatuses.js`). Legacy records may have `mainEmails` and
  inline `resumes` instead; the UI handles both.

**Sending** (`POST /api/sendEmails`). The body has shared `attachments`, a list
of `messages` (each an html letter plus attachment indexes), `recipients`
(each with `fields`, a `message` index, and its own `cc`/`bcc`) and `copyMe`
(BCC the sender's account address on every email). There is deliberately no
batch-wide CC/BCC. The client builds the body with
`lib/sendPayload.js`: identical letters become one message and each file is sent
once. Mail goes out **from the user's own address through their own mailbox**
(`lib/mailbox.js#senderTransport`); the route refuses with 400 while no mailbox
is connected. The server validates everything and fills `{{my_*}}` from the account
(`lib/autofill.js#senderFields`), ignoring any `my_*` the client sends. It refuses
if a required placeholder is empty, enforces limits, sends sequentially with a
1 s delay, then stores applications grouped by `lib/applications.js#groupByCompany`.

**Templates** (`lib/template.js`). `{{key}}` is required and `{{key|fallback}}`
is optional. Keys go through `normalizeKey` ("Company Name" → `company_name`).
`[bracketed]` text is a blank to fill in (`blanksIn`), and the UI blocks sending
while any remain. `renderTemplate(..., { html: true })` escapes values;
`{ only: true }` fills only the keys provided.

**Mail.**
- `lib/mailer.js#getTransporter` is the app's own account (`FROM`/`GMAIL_PASS`),
  used only for verification codes.
- `lib/mailbox.js` handles users' mailboxes. Users connect with an app password
  through `PUT /api/me/mailbox`, which signs in (`verifyMailbox`) before saving.
  Passwords are encrypted with AES-256-GCM using `MAILBOX_SECRET`. Server
  presets and MX detection are in `lib/mailProviders.js`. The SMTP host is
  resolved once, must be a public address (`isPublicAddress`), and is connected
  to by IP with TLS `servername`, which prevents SSRF and DNS rebinding.
  Ports are 465/587 only.
- When `SMTP_HOST` is set (Mailpit locally), **all** mail goes there, still from
  the user's address, and a connected mailbox isn't required (`testMode` in
  `/api/me`).
- `/api/me` returns `mailbox: { connected, host, port }` or
  `{ connected: false, suggested }`, and never the password. Build it with
  `lib/profile.js#profileJson`, because route files may only export handlers.

**Front end.**
- `src/app/page.js` is the client-side shell: session restore, hash-based tabs,
  and profile loading.
- Compose is a 3-step flow in `src/components/compose/`. All state and rules live
  in the `useCompose` hook; `StepRecipients`, `StepLetter`, `StepReview` and
  `EmailPreview` only render it.
- Letters and files are *variants*: `variants[""]` is the default, and
  `variants[roleKey]` overrides `letter` and/or `files` (null = inherit). This
  applies only while "Different per role" is on.
- Problems found by the checks are `{ step, text }` entries in `issues`.

## Conventions

- **Pure logic goes in `src/lib/`** with a matching test in `tests/unit/lib/`,
  and must not import Next or DB code. Server-only helpers (`mongodb.js`, `mailer.js`,
  `documents.js`) live there too but aren't imported by client code.
- **Limits live in `lib/limits.js`**, shared by the API and UI. Don't duplicate numbers.
- **Client API calls go through `utils/api.js#apiFetch`**. It parses JSON,
  throws on errors, and on a 401 fires `SESSION_ENDED`, which shows sign-in. The
  browser sends the session cookie by itself.
- **Any stored or user HTML rendered into the DOM goes through
  `utils/safeHtml.js#safeHtml`** (DOMPurify). Letters sent by email are wrapped by
  `wrapLetter` in `useCompose.js`, which inlines paragraph margins and bullet
  styles, because email clients lack the editor's CSS. Quill marks bullets as
  `<li data-list="bullet">` inside `<ol>`.
- **UI primitives** (`Button`, `Card`, `Field`, `Input`, `Modal`, `Badge`, …) are
  in `components/ui.js`. For feedback use `useToast()` from `components/Toast.js`;
  never `alert()`. Icons come from `lucide-react`; check a name exists in the
  installed version before using it.
- JSX is written in `.js` files. Path alias `@/` → `src/`.
- The large spreadsheet parser (`xlsx`) is imported dynamically. Keep it out of
  the main bundle.
- Keep user-facing copy plain and short; the UI was simplified on purpose.

## Security rules (do not regress)

- Never take a user id from a request body or query. Use `await currentUserId(req)`
  and scope every query by `userId`.
- Never put a session token in a response body or in browser storage. It lives
  only in the HttpOnly cookie.
- Public auth endpoints must not reveal whether an account exists (same response,
  run bcrypt against `DUMMY_HASH`), and must be rate limited.
- The page CSP is built in `lib/csp.js` (applied by the middleware); other
  security headers, and `no-store` for `/api`, are in `next.config.mjs`. If a
  feature needs a new source (fonts, images, APIs), add exactly that source;
  never `*`, and never `'unsafe-inline'` for scripts.
- Bound everything a user controls:
  - **Bodies:** `readJson(req, { maxBytes })` with a 64 KB default; documents
    and sends have their own caps in `lib/limits.js`.
  - **Storage:** `lib/documents.js#assertRoomFor` allows 50 files, 100 letters
    and 150 MB per account, and applies to sends too.
  - **Sends:** one at a time per user (`sendingUntil`).
  - **Spreadsheet imports:** 5 MB, 1,000 rows and 50 columns.
- Regexes that run on user text must be linear. See the comment on `PLACEHOLDER`
  in `lib/template.js`, and its test with 200k-character hostile input. Read field
  values with `Object.hasOwn`, never `in` or plain indexing.
- Validate every field on the server: emails via `lib/validate.js#isEmail`
  (rejects CR/LF and multiple addresses), sizes, PDF signature (`decodePdf`), enums.
- Don't return internal error messages. `errorResponse` already logs them and
  returns a generic 500.
- Verification codes and passwords are stored only as hashes. Mailbox app
  passwords are stored only encrypted, are `select: false`, and are never
  returned. Never send mail from an address other than the user's verified
  account email.
- Never commit `.env*` (only `.env.example`).

## Testing

All tests live in `tests/`, never next to source files. Import app code through `@/`.
- `tests/unit/`: lib functions, middleware, the `useCompose` hook and components.
- `tests/integration/`: API route handlers against MongoDB.

- **Unit and component** tests use Vitest; put `// @vitest-environment jsdom` at
  the top of files that render React or use the DOM, and mock `@/utils/api` for
  hook tests.
- **Integration tests** (`tests/integration/`):
  - Call route handlers through `call(handler, { method, body, userId, params, ip })`
    from `helpers.js`. `userId` sends a real session cookie for that user, and
    `ip` sets `X-Real-IP` for rate-limit tests.
  - `nodemailer` is mocked: sent mail is in `sentMail()`, and each message's
    `transport` holds the options it was sent through. A recipient address
    starting with `fail` simulates a failed delivery, and the app password
    `wrong-password` simulates a rejected sign-in.
  - `node:dns/promises` is mocked: `*.internal.test` resolves to a private
    address, and `workspace.test` has Google MX records.
  - Use `createUser({ mailbox: gmailMailbox() })` for a user who can send.
  - The database is wiped before each test, and the setup refuses any database
    whose name doesn't end in `-test`.
- Add or adjust tests with every behavior change, and run both suites before
  finishing.
- For UI changes, also check the page in a browser at desktop and phone widths
  (no horizontal scroll, no console errors).

## Local data and mail

- The local database is `bulk-applier`; the test database is `bulk-applier-test`.
- Inspect data with mongo-express or
  `docker compose exec mongo mongosh bulk-applier`. Exclude `content` when
  listing documents, because it holds whole PDFs.
- Local mail lands in Mailpit (http://localhost:8025, API at `/api/v1/messages`).
- The `samples/*.csv` files use the reserved `.test` / `example.*` domains, so
  nothing in them can reach a real inbox.
