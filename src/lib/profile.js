// Server-only: the signed-in user's profile as the client sees it.
import { suggestServer } from "./mailbox";

export const PROFILE_FIELDS = "email name phone link mailbox.host mailbox.port mailbox.connectedAt";

/**
 * The profile as the client sees it. `mailbox` says whether applications can be
 * sent from the user's own address (never includes the password); `testMode`
 * means all mail goes to a local catcher, so connecting is optional.
 */
export async function profileJson(user) {
  const connected = Boolean(user.mailbox?.host);
  return {
    email: user.email,
    name: user.name,
    phone: user.phone,
    link: user.link,
    mailbox: connected
      ? { connected, host: user.mailbox.host, port: user.mailbox.port }
      : { connected, suggested: await suggestServer(user.email) },
    testMode: Boolean(process.env.SMTP_HOST),
  };
}
