@AGENTS.md

## Claude Code notes

- The user usually has `npm run dev` running on :3000. Check with
  `ss -ltnp | grep 3000` before starting servers, and never run `next build` in
  this checkout while it runs. To test a production build or run a second server,
  rsync the repo (without `.next`, `.git`, `node_modules`) into the scratchpad and
  work there.
- The running dev server hot-reloads code and `.env`, so API changes can be
  checked against it with `curl` using the test account `dev@example.com` /
  `password123` (local data only). Sign in with
  `curl -c /tmp/c.txt -H "Origin: http://localhost:3000" -H 'content-type: application/json' -d '{"email":"dev@example.com","password":"password123"}' localhost:3000/api/login`,
  then pass `-b /tmp/c.txt -H "Origin: http://localhost:3000"` on later calls.
  Don't change that account's password; create throwaway `qa.<timestamp>@example.com`
  accounts for auth tests and delete them afterwards.
- A production build (`next start`) uses the `__Host-session` Secure cookie, so
  test it in Chrome on `localhost`, not with plain-HTTP curl cookie jars.
- For UI checks, drive system Chrome (`/usr/bin/google-chrome`) with
  `puppeteer-core` installed in the scratchpad, take screenshots at 1440px and
  390px, and look at them before reporting.
- Run `npm test` and `npm run lint` after every change, and also
  `npm run test:integration` after API or model changes (Docker services must be up).
