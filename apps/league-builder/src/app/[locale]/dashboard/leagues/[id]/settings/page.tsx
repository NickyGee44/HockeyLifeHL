import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import Link from 'next/link';
import {
  ArrowLeft } from 'lucide-react';
import { LeagueLogo } from '@/components/ui/league-logo';
import { SettingsTabsClient } from './settings-tabs-client';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function LeagueSettingsPage({ params, searchParams }: Props) {
  const awaited = await params;
  const awaitedSearch = await searchParams;
  const { locale, id: leagueId } = awaited;
  const { tab } = awaitedSearch;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[Page] Error fetching league:', leagueError?.message);
    notFound();
  }

  const leagueSettings = [
    {
      title: 'General',
      description: 'Basic league information and settings',
      icon: '',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/general` },
    {
      title: 'Website Editor',
      description: 'Customize your league website with live preview',
      icon: '',
      href: `/${locale}/website-editor`,
      highlight: true },
    {
      title: 'Billing',
      description: 'Payment collection and fee settings',
      icon: '',
      href: `/${locale}/dashboard/leagues/${leagueId}/billing` },
    {
      title: 'Scorekeepers',
      description: 'Manage scorekeepers and game assignments',
      icon: '',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/scorekeepers` },
  ];

  const orgSettings = [
    {
      title: 'Branding',
      description: 'Logo, colors, and visual identity',
      icon: '',
      href: `/${locale}/dashboard/settings/branding` },
    {
      title: 'Custom Domain',
      description: 'Set up your own domain for the league website',
      icon: '',
      href: `/${locale}/dashboard/settings/domains` },
    {
      title: 'Staff & Permissions',
      description: 'Manage league administrators and roles',
      icon: '',
      href: `/${locale}/dashboard/settings/members` },
    {
      title: 'Notifications',
      description: 'Email and push notification preferences',
      icon: '',
      href: `/${locale}/dashboard/settings/notifications` },
    {
      title: 'Subscription',
      description: 'Premium add-ons and billing management',
      icon: '',
      href: `/${locale}/dashboard/settings/subscription` },
    {
      title: 'Privacy',
      description: 'Data privacy and visibility settings',
      icon: '',
      href: `/${locale}/dashboard/settings/privacy` },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <h1 className="text-3xl font-black text-white tracking-tight"></h1>
          <p className="text-neutral-400 mt-1">
            Configure {league.name} settings and preferences
          </p>
        </div>

        {/* League Info Card */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <LeagueLogo
              logoUrl={league.logo_url}
              leagueName={league.name}
              primaryColor={league.primary_color || '#22D3EE'}
              size="lg"
              shape="square"
              bordered
            />
            <div>
              <h2 className="text-xl font-bold text-white">{league.name}</h2>
              <p className="text-neutral-400">{league.city}, {league.state_province}</p>
              <p className="text-sm text-neutral-500 mt-1">
                Subdomain: {league.subdomain || league.slug}.hockeylifehl.com
              </p>
            </div>
          </div>
        </div>

        {/* Tabbed*/}
        <SettingsTabsClient
          locale={locale}
          leagueId={leagueId}
          leagueSettings={leagueSettings}
          orgSettings={orgSettings}
          initialTab={tab || 'league'}
        />
      </div>
    </div>
  );
}
