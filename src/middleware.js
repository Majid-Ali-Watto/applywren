// src/middleware.js
import { NextResponse } from "next/server";

// Define public routes that don't need authentication
const PUBLIC_ROUTES = [
  '/api/login',
  '/api/register',
  '/api/verify'
];

// Define routes that should be protected
const PROTECTED_ROUTES = [
  '/api/applications',
  '/api/documents',
  '/api/sendEmails'
];

async function verifyJWT(token, secret) {
  try {
    // Split the token into parts
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    // Decode the payload
    const payload = JSON.parse(atob(payloadB64));
    
    // Check if token has expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token has expired');
    }

    return { valid: true, data: payload };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false, error: error.message };
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Check if it's an API route
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public routes to pass through
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if route should be protected
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    try {
      const token = authHeader.split(" ")[1].trim();
      console.log("🚀 ~ middleware ~ token:", token)
      const { valid, error, data } = await verifyJWT(token, process.env.JWT_SECRET);

      if (!valid) {
        return NextResponse.json(
          { error: "Invalid or expired token", details: error },
          { status: 401 }
        );
      }

      // Add user info to request headers for route handlers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', data.userId);
      requestHeaders.set('x-user-email', data.email);

      // Return response with modified headers
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.json(
        { error: "Invalid or expired token", details: error.message },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};