// Client-side fetch wrapper: sends/parses JSON and turns error responses into
// thrown Errors carrying the server's message. The session is an HttpOnly
// cookie the browser sends by itself; scripts never see it.

/** Fired when the server says the session is missing or over; the app shows sign-in. */
export const SESSION_ENDED = "applywren:session-ended";

export async function apiFetch(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401) window.dispatchEvent(new Event(SESSION_ENDED));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
