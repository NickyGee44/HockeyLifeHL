import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'BeerLeagueHockey | Premium League Management Platform',
  description:
    'The operating system for recreational hockey. Premium league management platform for teams, schedules, standings, payments, and more.',
  keywords: [
    'hockey league management',
    'recreational hockey',
    'beer league hockey',
    'team management',
    'sports management software',
  ],
  authors: [{ name: 'BeerLeagueHockey' }],
  creator: 'BeerLeagueHockey',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://beerleaguehockey.com',
    siteName: 'BeerLeagueHockey',
    title: 'BeerLeagueHockey | Premium League Management Platform',
    description:
      'The operating system for recreational hockey. Premium league management platform for teams, schedules, standings, payments, and more.',
    images: [
      {
        url: '/BLH-banner.png',
        width: 1200,
        height: 630,
        alt: 'BeerLeagueHockey',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BeerLeagueHockey | Premium League Management Platform',
    description:
      'The operating system for recreational hockey. Premium league management platform.',
    images: ['/BLH-banner.png'],
  },
  icons: {
    icon: '/BLH-icon.png',
    shortcut: '/BLH-icon.png',
    apple: '/BLH-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

// Inline script to prevent theme flash
const themeScript = `
  (function() {
    const stored = localStorage.getItem('blh-theme-preference');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
