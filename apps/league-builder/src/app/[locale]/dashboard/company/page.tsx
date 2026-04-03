/**
 * Organization Profile Page
 *
 * Displays and manages organization profile settings. An organization can have
 * multiple leagues under it.
 */

import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { isOrganizationManagerAccess } from '@/lib/organizations/access';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  Building2,
  Trophy,
  Users,
  Settings,
  CreditCard,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { LeagueLogo } from '@/components/ui/league-logo';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CompanyProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();
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

  const isOwner = organization.owner_user_id === userData.user.id;
  const isManager =
    isOwner || isOrganizationManagerAccess((organization as any).access_type);
  const accessLabel = isOwner ? t('company.owner') : isManager ? t('company.manager') : t('company.member');

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-rink-500/10">
              <Building2 className="w-6 h-6 text-rink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Organization Profile
              </h1>
              <p className="text-neutral-400 text-sm">
                Manage your organization identity, portfolio, and billing context.
              </p>
            </div>
          </div>
        </div>

        {/* Organization Info Card */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{organization.name}</h2>
              <p className="text-sm text-neutral-500">
                {accessLabel}
              </p>
            </div>
            {isManager && (
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                {t('common.edit')}
              </Link>
            )}
          </div>

          {/* Organization Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/[0.06]">
            <div className="bg-neutral-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-rink-500" />
                <span className="text-xs text-neutral-400 uppercase tracking-wider">
                  {t('company.leagues')}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {organization.leagues?.length || 0}
              </p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-arena-500" />
                <span className="text-xs text-neutral-400 uppercase tracking-wider">
                  {t('teams.title')}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {organization.leagues?.reduce((sum: number, l: any) => sum + (l.team_count || 0), 0) || 0}
              </p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-500" />
                <span className="text-xs text-neutral-400 uppercase tracking-wider">
                  {t('players.title')}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {organization.leagues?.reduce((sum: number, l: any) => sum + (l.player_count || 0), 0) || 0}
              </p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-neutral-400 uppercase tracking-wider">
                  {t('navigation.billing')}
                </span>
              </div>
              <Link
                href="/dashboard/settings/billing"
                className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
              >
                {t('common.view')}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Leagues Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Organization Leagues</h2>
            <Link
              href="/dashboard/leagues/new"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-4 h-4" />
              {t('navigation.createLeague')}
            </Link>
          </div>

          {organization.leagues && organization.leagues.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organization.leagues.map((league: any) => (
                <Link
                  key={league.id}
                  href={`/dashboard/leagues/${league.id}`}
                  className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-5 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <LeagueLogo
                      logoUrl={league.logo_url}
                      leagueName={league.name}
                      primaryColor={league.primary_color || '#22D3EE'}
                      size="sm"
                      shape="square"
                      bordered
                    />
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        league.status === 'active'
                          ? 'bg-green-500/10 text-green-500'
                          : league.status === 'draft'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-neutral-800 text-neutral-400'
                      )}
                    >
                      {league.status || 'active'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mb-1 group-hover:text-rink-500 transition-colors">
                    {league.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {league.team_count || 0} teams
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rink-500/10 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-rink-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No leagues yet</h3>
              <p className="text-neutral-400 mb-6">
                Create the first league shell for this organization.
              </p>
              <Link
                href="/dashboard/leagues/new"
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
                )}
              >
                <Plus className="w-4 h-4" />
                {t('navigation.createLeague')}
              </Link>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-rink-500 transition-colors">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-white">Organization Settings</h3>
              <p className="text-sm text-neutral-500">Manage organization details and account-level preferences.</p>
            </div>
          </Link>
          <Link
            href="/dashboard/settings/billing"
            className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-rink-500 transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-white">Billing</h3>
              <p className="text-sm text-neutral-500">Review platform billing and organization-level charges.</p>
            </div>
          </Link>
          <Link
            href="/dashboard/settings/members"
            className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-rink-500 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-white">Organization Members</h3>
              <p className="text-sm text-neutral-500">Manage the people who help operate this organization.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
