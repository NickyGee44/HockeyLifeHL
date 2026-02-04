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

// Root layout - Next.js 15+ requires html and body tags
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
