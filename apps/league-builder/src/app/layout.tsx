import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HockeyLife - League Builder',
  description: 'Build and manage your hockey league',
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
