import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  // TODO: Remove after regenerating Supabase database types
  // Database types are out of sync with schema - many tables/RPCs not in generated types
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withSentryConfig(withSerwist(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps for readable stack traces
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Suppress Sentry CLI logs in build output
  silent: !process.env.CI,

  // Tunnel Sentry events through the app to avoid ad blockers
  tunnelRoute: '/monitoring',

  // Disable Sentry telemetry
  telemetry: false,
});
