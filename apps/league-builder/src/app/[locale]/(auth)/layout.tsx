'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 aurora-bg">

      <div className="relative w-full max-w-md px-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rink-500 to-arena-500 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-black" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Beer League Hockey
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            {t('auth.tagline')}
          </p>
        </div>

        {children}

        {/* Footer links */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
            <Link
              href="/privacy"
              className="hover:text-rink-500 transition-colors"
            >
              {t('footer.legal.privacy')}
            </Link>
            <span>|</span>
            <Link
              href="/terms"
              className="hover:text-rink-500 transition-colors"
            >
              {t('footer.legal.terms')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
