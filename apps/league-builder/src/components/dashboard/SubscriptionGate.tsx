import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { Crown, CheckCircle2, ArrowRight } from 'lucide-react';

interface SubscriptionGateProps {
  children: React.ReactNode;
  isSubscribed: boolean;
}

const PLATFORM_FEATURES = [
  'unlimitedTeams',
  'scheduleGeneration',
  'scorekeepingApp',
  'playerRegistration',
  'standingsAndStats',
  'leagueWebsite',
  'newsAndContent',
  'emailNotifications',
] as const;

export function SubscriptionGate({ children, isSubscribed }: SubscriptionGateProps) {
  if (isSubscribed) {
    return <>{children}</>;
  }

  return (
    <>
      <SubscriptionNotice />
      {children}
    </>
  );
}

async function SubscriptionNotice() {
  const t = await getTranslations('subscription.gate');

  return (
    <div className="px-4 pt-4">
      <div className="mx-auto max-w-5xl rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rink-500/20 to-arena-500/20">
              <Crown className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white mb-1">
                {t('title')}
              </h2>
              <p className="text-sm text-neutral-300 max-w-2xl">
                {t('description')}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20 transition-all"
          >
            {t('cta')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mt-5 text-left">
          <p className="text-sm font-semibold text-white mb-4">{t('includes')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLATFORM_FEATURES.map((key) => (
              <div key={key} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-neutral-300">{t(`features.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
