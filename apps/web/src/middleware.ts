import { NextRequest, NextResponse } from 'next/server';

// `NEXT_PUBLIC_API_URL` is the browser-reachable api origin
// (`http://localhost:4000` via the host port-forward). It's inlined into
// the client bundle at build time and also read here at runtime by the
// middleware to populate CSP img/media/frame/connect-src entries — all
// of which the browser enforces, so the value MUST be one the browser
// can actually reach. The server-side rewrite destination is a separate
// `API_INTERNAL_URL` env var (see next.config.ts) so Next.js can target
// the api by its docker service name without leaking that hostname into
// CSP.
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
    // `media-src` allows <video>/<audio> elements to stream uploaded assets
    // proxied through the api (`${API_ORIGIN}/uploads/<key>`). `frame-src`
    // allows the SCORM player iframe to embed the launch URL. Both default
    // to `default-src 'self'` if missing, which blocks playback of any
    // uploaded video/audio and iframe embeds.
    `media-src 'self' blob: ${API_ORIGIN}`,
    `frame-src 'self' ${API_ORIGIN}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${API_ORIGIN} ws: wss:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    // `frame-ancestors 'self' http://localhost:3000 http://localhost:3001`
    // allows the lesson player page (localhost:3000) to embed the SCORM
    // iframe whose launch URL is also same-origin
    // (`/api/scorm-content/<key>/...`). With 'none' the browser blocks the
    // embed even though both pages live on the same host.
    `frame-ancestors 'self' http://localhost:3000 http://localhost:3001`,
  ].join('; ');
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // X-Frame-Options is the legacy predecessor of CSP's frame-ancestors.
  // SAMEORIGIN matches our relaxed `frame-ancestors 'self'` policy so
  // the SCORM iframe (loaded same-origin via the rewrite to the api) is
  // not blocked by older browsers / intermediaries that still honour
  // X-Frame-Options over frame-ancestors.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
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
