import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import { OrganizationProfileForm } from '@/components/dashboard/organization-profile-form';
import { Copy, AlertTriangle } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OrganizationProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('orgSettings');
  const userData = await getCurrentUser();

  if (!userData) {
    redirect({ href: '/login', locale });
    return null;
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect({ href: '/dashboard', locale });
    return null;
  }

  const orgData = organization as any;

  return (
    <div className="space-y-8">
      {/* Organization Profile Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">{t('profile')}</h2>
          <p className="text-sm text-neutral-400 mt-1">
            {t('profileDescription')}
          </p>
        </div>
        <OrganizationProfileForm organization={orgData} />
      </section>

      {/* Organization ID Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">{t('organizationId')}</h2>
          <p className="text-sm text-neutral-400 mt-1">
            {t('organizationIdDescription')}
          </p>
        </div>
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <code className="text-sm text-rink-500 font-mono">{orgData.id}</code>
          <button
            className={cn(
              'p-2 rounded-lg transition-colors',
              'text-neutral-400 hover:text-rink-500 hover:bg-white/[0.06]'
            )}
            title={t('copyId')}
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Danger Zone Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t('dangerZone')}
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            {t('dangerZoneDescription')}
          </p>
        </div>
        <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-2">{t('deleteOrganization')}</h3>
          <p className="text-sm text-neutral-400 mb-4">
            {t('deleteOrganizationDescription')}
          </p>
          <button
            disabled
            className={cn(
              'px-4 py-2.5 rounded-xl font-medium text-sm',
              'bg-red-500/20 text-red-400 border border-red-500/30',
              'opacity-50 cursor-not-allowed'
            )}
          >
            {t('deleteOrganization')}
          </button>
          <p className="text-xs text-neutral-500 mt-3">
            {t('contactSupport')}
          </p>
        </div>
      </section>
    </div>
  );
}
