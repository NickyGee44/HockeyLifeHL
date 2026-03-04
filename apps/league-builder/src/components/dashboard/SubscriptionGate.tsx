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

  return <SubscriptionRequired />;
}

async function SubscriptionRequired() {
  const t = await getTranslations('subscription.gate');

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rink-500/20 to-arena-500/20">
          <Crown className="h-8 w-8 text-yellow-400" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          {t('title')}
        </h2>
        <p className="text-neutral-400 mb-8">
          {t('description')}
        </p>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-6 text-left">
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

        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-3xl font-black text-white">$0</span>
          <span className="text-neutral-500 text-sm">/mo</span>
        </div>

        <Link
          href="/dashboard/settings/billing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20 transition-all"
        >
          {t('cta')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
