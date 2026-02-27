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
      icon: 'Settings',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/general` },
    {
      title: 'Website Editor',
      description: 'Customize your league website with live preview',
      icon: 'Palette',
      href: `/${locale}/website-editor?league=${leagueId}`,
      highlight: true },
    {
      title: 'Billing',
      description: 'Payment collection and fee settings',
      icon: 'CreditCard',
      href: `/${locale}/dashboard/leagues/${leagueId}/billing` },
    {
      title: 'Venues & Ice Times',
      description: 'Manage rinks, weekly availability, and blackout dates',
      icon: 'MapPin',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/venues` },
    {
      title: 'Game Rules',
      description: 'Penalty types, durations, and game rule overrides',
      icon: 'Gavel',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/game-rules` },
    {
      title: 'Scorekeepers',
      description: 'Manage scorekeepers and game assignments',
      icon: 'ClipboardCheck',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/scorekeepers` },
    {
      title: 'Referees',
      description: 'Manage referees and game officiating assignments',
      icon: 'Shield',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/referees` },
    {
      title: 'Waiver',
      description: 'Manage liability waiver and view signed agreements',
      icon: 'ScrollText',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/waiver` },
    {
      title: 'Email Sending Domain',
      description: 'Send league emails from your own domain',
      icon: 'Mail',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/email-domain` },
    {
      title: 'Goalie Pool',
      description: 'Manage substitute goalies and marketplace requests',
      icon: 'Shield',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/goalie-pool` },
  ];

  const orgSettings = [
    {
      title: 'Branding',
      description: 'Logo, colors, and visual identity',
      icon: 'Palette',
      href: `/${locale}/dashboard/settings/branding` },
    {
      title: 'Custom Domain',
      description: 'Set up your own domain for the league website',
      icon: 'Globe',
      href: `/${locale}/dashboard/settings/domains` },
    {
      title: 'Staff & Permissions',
      description: 'Manage league administrators and roles',
      icon: 'Users',
      href: `/${locale}/dashboard/settings/members` },
    {
      title: 'Notifications',
      description: 'Email and push notification preferences',
      icon: 'Bell',
      href: `/${locale}/dashboard/settings/notifications` },
    {
      title: 'Billing & Subscriptions',
      description: 'Plan, add-ons, and payment processing',
      icon: 'Receipt',
      href: `/${locale}/dashboard/settings/billing` },
    {
      title: 'Privacy',
      description: 'Data privacy and visibility settings',
      icon: 'Shield',
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
                Subdomain: {league.subdomain || league.slug}.beerleaguehockey.ca
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
