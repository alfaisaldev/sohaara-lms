import type { NextConfig } from 'next';

// See web/next.config.ts — `NEXT_PUBLIC_API_URL` is the browser-reachable
// api origin (CSP / client-side fetch base), `API_INTERNAL_URL` is the
// server-side docker service name used by the rewrites below.
const BROWSER_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const INTERNAL_API_URL = process.env.API_INTERNAL_URL || 'http://api:4000';

const nextConfig: NextConfig = {
  transpilePackages: ['@sohaara/ui', '@sohaara/shared', '@sohaara/types'],
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['@sohaara/ui', 'lucide-react', 'framer-motion'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Override Next.js 16's auto-generated nonce-based CSP. See web/next.config.ts
          // for the full explanation — long story: 'unsafe-inline' is ignored when a
          // nonce is present, so every inline RSC <script> is blocked, hydration
          // never completes, and the page hangs on its loading shell.
          {
            key: 'Content-Security-Policy',
            // See web/next.config.ts — `media-src` and `frame-src` must be
            // opened to the api origin so uploaded video/audio and SCORM
            // iframe embeds can load. `frame-ancestors 'self' <web>` allows
            // the web app's lesson player to embed any same-origin admin
            // route it needs to (none today, but the rule is consistent
            // with web's policy).
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: ${BROWSER_API_URL}; media-src 'self' blob: ${BROWSER_API_URL}; frame-src 'self' ${BROWSER_API_URL}; font-src 'self' data:; connect-src 'self' ${BROWSER_API_URL} ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' http://localhost:3000 http://localhost:3001`,
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // See web/next.config.ts — DENY would re-block SCORM iframe
          // embeds; SAMEORIGIN matches the relaxed frame-ancestors policy.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${INTERNAL_API_URL}/uploads/:path*`,
      },
      // Same SCORM proxy as the web app — see web/next.config.ts. The admin
      // preview pane can also launch SCORM packages for QA.
      {
        source: '/api/scorm-content/:path*',
        destination: `${INTERNAL_API_URL}/uploads/scorm/:path*`,
      },
    ];
  },
};

export default nextConfig;
