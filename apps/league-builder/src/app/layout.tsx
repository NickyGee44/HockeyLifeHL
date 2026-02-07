import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beer League Hockey - League Builder',
  description: 'Build and manage your hockey league',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
};

// Root layout - passes through to locale layout which has html/body tags
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Don't wrap in html/body here - the [locale]/layout.tsx handles that
  return children;
}
