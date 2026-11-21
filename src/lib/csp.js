// Content-Security-Policy for HTML pages, built per request by the middleware.
// Scripts run only with this request's nonce (Next.js adds it to its own
// scripts); 'strict-dynamic' lets those load the app's code chunks. Styles stay
// 'unsafe-inline' because the editor and React set inline styles; styles can't
// run code. blob: is for PDF previews made in the browser. No external sources.
export function contentSecurityPolicy(nonce, { dev = false } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "frame-src 'self' blob:",
    "object-src 'self' blob:",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** A fresh random nonce (base64 of 16 random bytes). */
export function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
