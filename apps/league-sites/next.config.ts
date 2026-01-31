import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable experimental features for multi-tenant subdomain routing
  experimental: {
    // Allow reading from workspace packages
  },

  // Configure images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Transpile workspace packages
  transpilePackages: ['@hockey-life/database', '@hockey-life/ui'],

  // Enable static generation with ISR for league pages
  // Top 100 leagues will be pre-rendered at build time
  // Others will be generated on-demand with 60s revalidation
};

export default nextConfig;
