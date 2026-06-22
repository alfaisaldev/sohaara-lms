import { NextRequest, NextResponse } from 'next/server';

// See web/src/middleware.ts — `NEXT_PUBLIC_API_URL` is the browser-
// reachable api origin used by CSP and client fetches. The server-side
// rewrite destination is a separate `API_INTERNAL_URL` env var
// (see admin/next.config.ts).
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_ORIGIN = new URL(API_URL).origin;

// No nonce in script-src: see web/src/middleware.ts for the full explanation.
// The previous shape combined 'unsafe-inline' with a per-request nonce, and
// the CSP spec ignores 'unsafe-inline' when a nonce is present, so every
// Next.js inline RSC <script> was blocked and the page hung on its loading
// shell.
function buildCsp(): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${API_ORIGIN}`,
    // See web/src/middleware.ts — opened so uploaded media and SCORM
    // iframes load from the api origin instead of being blocked by the
    // default-src 'self' fallback.
    `media-src 'self' blob: ${API_ORIGIN}`,
    `frame-src 'self' ${API_ORIGIN}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${API_ORIGIN} ws: wss:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    // Matches web/src/middleware.ts — 'self' + the web origin so the SCORM
    // player iframe (which lives under localhost:3000) can embed this
    // admin app if needed for preview tooling.
    `frame-ancestors 'self' http://localhost:3000 http://localhost:3001`,
  ].join('; ');
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // See web/src/middleware.ts — SAMEORIGIN keeps us consistent with
  // frame-ancestors 'self' for browsers / intermediaries that still
  // honour X-Frame-Options.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/auth')) {
    const authCookie = request.cookies.get('admin_auth')?.value;
    if (!authCookie) {
      return NextResponse.redirect(new URL('/admin/auth/start', request.url));
    }
  }

  response.headers.set('Content-Security-Policy', buildCsp());

  for (const h of securityHeaders) {
    response.headers.set(h.key, h.value);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
