import type { NextConfig } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: http://localhost:4000; font-src 'self' data:; connect-src 'self' http://localhost:4000 ws: wss:; frame-src 'self' http://localhost:4000; media-src 'self' http://localhost:4000 blob: data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
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
        destination: `${API_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
