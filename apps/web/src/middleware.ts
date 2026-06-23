import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_ORIGIN = new URL(API_URL).origin;

// No nonce in script-src: Next.js 16 emits inline <script> tags for the RSC
// payload that this middleware cannot tag with the per-request nonce. The
// CSP spec says `'unsafe-inline'` is ignored when a nonce is present, so the
// previous config blocked every inline script → page stuck on loading → RSC
// stream aborted → "Connection closed". `'unsafe-inline'` alone is the only
// shape that actually allows Next's inline RSC bootstrap to run.
function buildCsp(): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${API_ORIGIN}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${API_ORIGIN} ws: wss:`,
    `frame-src 'self' ${API_ORIGIN}`,
    `media-src 'self' ${API_ORIGIN} blob: data:`,
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

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Content-Security-Policy', buildCsp());

  for (const h of securityHeaders) {
    response.headers.set(h.key, h.value);
  }

  return response;
}
