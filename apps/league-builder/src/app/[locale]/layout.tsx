import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import '../globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider, themeScript } from '@/components/ThemeProvider';
import { locales, type Locale } from '@/i18n/config';

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

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate that the incoming locale is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Fetch messages for the current locale
  const messages = await getMessages();

  return (
    <>
      <Script
        id="theme-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: themeScript }}
      />
      <NextIntlClientProvider messages={messages}>
        <ThemeProvider defaultTheme="dark" enableSystem enableTransition>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            richColors
            toastOptions={{
              style: {
                borderRadius: '12px',
                border: '1px solid oklch(0.35 0 0)',
                background: 'oklch(0.18 0 0)',
                color: 'oklch(0.9 0 0)',
                fontFamily: 'Inter, sans-serif',
              },
              classNames: {
                success: '[&>[data-icon]]:text-emerald-400',
                error: '[&>[data-icon]]:text-red-400',
                info: '[&>[data-icon]]:text-[#d4af37]',
                warning: '[&>[data-icon]]:text-amber-400',
              },
            }}
          />
        </ThemeProvider>
      </NextIntlClientProvider>
    </>
  );
}
