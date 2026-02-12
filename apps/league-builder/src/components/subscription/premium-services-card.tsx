/**
 * Premium Services Card Component
 *
 * Contact-based services (custom domain, historic data import).
 */

import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';

export function PremiumServicesCard() {
  const t = useTranslations('subscription.premiumServices');
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-white mb-4">{t('title')}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Custom Domain */}
        <div className="bg-neutral-800/50 rounded-xl p-4">
          <h3 className="font-medium text-white mb-2">{t('customDomain')}</h3>
          <p className="text-sm text-neutral-400 mb-3">
            {t('customDomainDesc')}
          </p>
          <a
            href="mailto:support@beerleaguehockey.ca?subject=Custom Domain Inquiry"
            className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1 transition-colors"
          >
            <Mail className="w-4 h-4" />
            {t('requestQuote')}
          </a>
        </div>

        {/* Historic Data Import */}
        <div className="bg-neutral-800/50 rounded-xl p-4">
          <h3 className="font-medium text-white mb-2">{t('historicDataImport')}</h3>
          <p className="text-sm text-neutral-400 mb-3">
            {t('historicDataImportDesc')}
          </p>
          <a
            href="mailto:support@beerleaguehockey.ca?subject=Historic Data Import Inquiry"
            className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1 transition-colors"
          >
            <Mail className="w-4 h-4" />
            {t('requestQuote')}
          </a>
        </div>
      </div>
    </div>
  );
}
