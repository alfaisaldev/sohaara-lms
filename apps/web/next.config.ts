import type { NextConfig } from 'next';

// `NEXT_PUBLIC_API_URL` is the *browser*-reachable api origin (e.g.
// `http://localhost:4000` through the host port-forward). It's exposed to
// the client bundle and used by `lib/api.ts` for fetch URLs and by
// middleware.ts for CSP img/media/frame/connect-src entries.
//
// `API_INTERNAL_URL` is the *server*-side destination used by `rewrites()`
// below. It is intentionally NOT a NEXT_PUBLIC_ var so it's never
// exposed to the client bundle — the browser has no use for the docker
// service name `api` (which is unreachable outside the docker network).
// Inside the compose network the api container is reachable as `api`
// (service name) on port 4000; we never want the browser to attempt that
// directly, so we keep it server-only.
const BROWSER_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const INTERNAL_API_URL = process.env.API_INTERNAL_URL || 'http://api:4000';

const nextConfig: NextConfig = {
  transpilePackages: ['@sohaara/ui', '@sohaara/shared', '@sohaara/types'],
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['@sohaara/ui', 'lucide-react', 'framer-motion'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.sohaara.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Override Next.js 16's auto-generated nonce-based CSP. The default
          // ships both `'unsafe-inline'` and a per-request nonce in script-src,
          // and the CSP spec says `'unsafe-inline'` is ignored when a nonce is
          // present — so every inline RSC `<script>` is blocked, hydration
          // never completes, and the page hangs on its loading shell.
          // Use `'unsafe-inline'` only (no nonce) and keep 'unsafe-eval' for
          // Next's bundled chunks.
          {
            key: 'Content-Security-Policy',
            // `media-src` must include the api origin so <video>/<audio>
            // elements can stream uploaded assets from
            // `${BROWSER_API_URL}/uploads/<key>` (the api proxies MinIO).
            // `frame-src` allows the SCORM player iframe to embed the api's
            // launch URL. Without these, default-src 'self' kicks in and the
            // browser blocks the playback with a CSP violation.
            //
            // `frame-ancestors` is set to 'self' (not 'none') so the lesson
            // player page at `/courses/<id>/player/<lessonId>` can host a
            // SCORM iframe pointing back at this same origin's
            // `/api/scorm-content/<key>/...` route. With 'none' the SCORM
            // package would be blocked from loading even though both pages
            // are same-origin.
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: ${BROWSER_API_URL}; media-src 'self' blob: ${BROWSER_API_URL}; frame-src 'self' ${BROWSER_API_URL}; font-src 'self' data:; connect-src 'self' ${BROWSER_API_URL} ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' http://localhost:3000 http://localhost:3001`,
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // X-Frame-Options is the legacy predecessor of CSP's
          // frame-ancestors. Setting it to DENY would override our relaxed
          // frame-ancestors 'self' ... policy and re-block the SCORM
          // iframe embed. SAMEORIGIN matches `frame-ancestors 'self'`
          // behaviour for browsers that still honour X-Frame-Options.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // /uploads/*  — uploaded media proxied through the api (which itself
      // streams from MinIO). The video-player.tsx and scorm-player.tsx
      // components resolve asset URLs to this prefix. Destination uses
      // the *internal* api URL because Next.js connects from inside the
      // docker network and must reach the api by service name.
      {
        source: '/uploads/:path*',
        destination: `${INTERNAL_API_URL}/uploads/:path*`,
      },
      // /api/scorm-content/*  — SCORM package launch URLs. The lesson player
      // embeds the SCORM package's indexAPI.html (or equivalent entry) in
      // an iframe pointing here, and the api serves the extracted package
      // files from the `sohaara-scorm` MinIO bucket. Without this rewrite
      // Next.js returns 502 because there's no matching route on port 3000.
      {
        source: '/api/scorm-content/:path*',
        destination: `${INTERNAL_API_URL}/uploads/scorm/:path*`,
      },
    ];
  },
};

export default nextConfig;
