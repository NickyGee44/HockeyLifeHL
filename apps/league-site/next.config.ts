import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@hockey-life/database', '@hockey-life/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
  // Enable experimental features for multi-tenant routing
  experimental: {
    // Allow dynamic params in generateStaticParams
  },
};

export default nextConfig;
