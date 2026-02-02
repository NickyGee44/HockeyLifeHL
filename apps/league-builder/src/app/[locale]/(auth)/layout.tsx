'use client';

import { Link } from '@/i18n/navigation';
import { Trophy } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-md px-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-black" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">
            HockeyLife<span className="text-gold-500">HL</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            League Builder Platform
          </p>
        </div>

        {children}

        {/* Footer links */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
            <Link
              href="/privacy"
              className="hover:text-gold-500 transition-colors"
            >
              Privacy Policy
            </Link>
            <span>|</span>
            <Link
              href="/terms"
              className="hover:text-gold-500 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
