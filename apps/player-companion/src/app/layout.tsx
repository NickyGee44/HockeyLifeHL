import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { BottomNav } from '@/components/nav/BottomNav';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'HockeyLifeHL Player',
  description: 'Your hockey companion - schedule, stats, and team info',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HockeyLife',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#D4AF37' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* PWA Icons */}
        <link rel="icon" href="/icons/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" href="/icons/favicon-16x16.png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/icons/favicon.ico" />

        {/* Splash screens for iOS */}
        <link
          rel="apple-touch-startup-image"
          href="/icons/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px)"
        />
      </head>
      <body className="min-h-screen bg-neutral-950 antialiased">
        <main className="min-h-screen pb-24 max-w-[428px] mx-auto">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
