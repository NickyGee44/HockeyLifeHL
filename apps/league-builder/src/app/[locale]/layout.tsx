import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '../globals.css';
import { ThemeProvider, themeScript } from '@/components/ThemeProvider';
import { locales, type Locale } from '@/i18n/config';

export const metadata: Metadata = {
  title: 'HockeyLife - League Builder',
  description: 'Build and manage your hockey league',
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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-neutral-950 text-white antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider defaultTheme="dark" enableSystem enableTransition>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
