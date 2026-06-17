import { NextRequest, NextResponse } from 'next/server';

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
    `font-src 'self' data:`,
    `connect-src 'self' ${API_ORIGIN} ws: wss:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const authCookie = request.cookies.get('admin_auth')?.value;
    if (!authCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
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
