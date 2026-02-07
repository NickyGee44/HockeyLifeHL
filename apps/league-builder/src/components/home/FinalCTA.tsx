'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function FinalCTA() {
  const t = useTranslations('homepage');

  return (
    <div className="px-6 py-24 lg:px-12 bg-gradient-to-b from-neutral-900 to-neutral-950">
      <div className="max-w-4xl mx-auto text-center">
        <Image
          src="/logo.png"
          alt="Beer League Hockey"
          width={120}
          height={120}
          className="w-24 h-24 mx-auto mb-8 object-contain opacity-80"
        />
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
          {t('finalCta.headline')}
        </h2>
        <p className="text-lg text-neutral-400 mb-8 max-w-xl mx-auto">
          {t('finalCta.subheadline')}
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rink-500 to-arena-500 text-neutral-950 font-bold rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-rink-500/25"
        >
          {t('finalCta.cta')}
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
