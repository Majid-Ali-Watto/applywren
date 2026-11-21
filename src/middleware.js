import { NextResponse } from "next/server";
import { sessionCookieName, verifyToken } from "@/lib/auth";
import { contentSecurityPolicy, createNonce } from "@/lib/csp";

// Every /api route requires a signed-in session except these.
const PUBLIC_ROUTES = ["/api/login", "/api/register", "/api/verify", "/api/password-reset", "/api/password-reset/confirm", "/api/logout"];

/**
 * Blocks cross-site requests that change things (CSRF), on top of the
 * SameSite cookie. Browsers send Sec-Fetch-Site (or at least Origin) with
 * every POST/PUT/DELETE.
 */
function isSameOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return Boolean(origin && host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Pages: a fresh nonce per request, so only scripts Next.js emits can run. */
function withPageSecurity(request) {
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, { dev: process.env.NODE_ENV !== "production" });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy); // Next.js reads the nonce from here
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export async function middleware(request) {
  if (!request.nextUrl.pathname.startsWith("/api/")) return withPageSecurity(request);

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  if (PUBLIC_ROUTES.includes(request.nextUrl.pathname)) return NextResponse.next();

  // First line of defence: turn away requests without a valid session early.
  // Routes verify the cookie again themselves (lib/accounts.js#currentUserId).
  const token = request.cookies.get(sessionCookieName())?.value;
  if (!token) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    await verifyToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }
}

export const config = {
  matcher: [
    "/api/:path*",
    // Pages (not static files, images or prefetches, which carry no HTML).
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|opengraph-image|robots.txt|sitemap.xml|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
