import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Globe,
  LayoutGrid,
  Play,
  PlugZap,
  Settings,
  Users,
} from 'lucide-react';
import { LeagueLogo } from '@/components/ui/league-logo';
import { AnnouncementComposerButton } from '@/components/news/AnnouncementComposerButton';
import { SetupChecklistCard } from '@/components/onboarding/SetupChecklistCard';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { getSignedWaivers } from '@/lib/actions/waiver-management';
import { getSeasonStatusLabel } from '@/lib/seasons/status-display';
import {
  buildLeagueSeasonsHref,
  buildSeasonWorkspaceHref,
} from '@/lib/dashboard/workspace-routes';
import { getPreferredSeasonWorkspace } from '@/lib/dashboard/server-workspace';
import { buildLeagueHubChecklistState } from '@/lib/onboarding/routing';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function localizeHref(locale: string, href: string) {
  return href.startsWith(`/${locale}/`) ? href : `/${locale}${href}`;
}

export default async function LeagueDetailPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('leagues');
  const { supabase, userData } = await requireLeagueDashboardAccess({ leagueId, locale });

  const { data: league, error } = await supabase
    .from('leagues')
    .select(`
      *,
      seasons (
        id,
        name,
        status,
        start_date,
        end_date,
        registration_type
      )
    `)
    .eq('id', leagueId)
    .single();

  if (error || !league) {
    console.error('[League Page] Error fetching league', error?.message, {
      leagueId,
      userId: userData?.user?.id,
    });
    notFound();
  }

  const currentSeason = await getPreferredSeasonWorkspace(leagueId, (league.seasons as any[]) ?? []);

  const [
    { count: teamsCount },
    { count: divisionsCount },
    { count: pendingRegistrations },
    { count: pendingGames },
    { count: activeSuspensions },
    { count: unreadMessages },
    signedWaiversResult,
  ] = await Promise.all([
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('league_id', leagueId),
    supabase.from('divisions').select('*', { count: 'exact', head: true }).eq('league_id', leagueId),
    (supabase.from('registration_submissions') as any)
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'pending')
      .not('submitted_at', 'is', null),
    currentSeason
      ? supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', leagueId)
          .eq('season_id', currentSeason.id)
          .eq('status', 'completed')
          .or('home_captain_verified.eq.false,away_captain_verified.eq.false')
      : Promise.resolve({ count: 0 }),
    (supabase.from('suspensions') as any)
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'active'),
    supabase
      .from('contact_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('is_read', false),
    getSignedWaivers(leagueId, { limit: 5 }),
  ]);

  const signedWaiversTotal = signedWaiversResult.success ? signedWaiversResult.data?.total || 0 : 0;
  const leagueSettings = (league.settings as Record<string, any> | null) ?? {};
  const onboardingSettings = (leagueSettings.onboarding as Record<string, any> | undefined) ?? {};
  const paymentSettings = (leagueSettings.payment as Record<string, any> | undefined) ?? {};
  const websiteSettings = (leagueSettings.website as Record<string, any> | undefined) ?? {};
  const domainSettings = (leagueSettings.domain as Record<string, any> | undefined) ?? {};

  const leagueChecklist = buildLeagueHubChecklistState({
    leagueId,
    hasSeason: ((league.seasons as any[]) ?? []).length > 0,
    enableOnlinePayments:
      onboardingSettings.enableOnlinePayments === true ||
      paymentSettings.onboardingRequested === true,
    stripeReady:
      paymentSettings.stripeAccountStatus === 'connected' ||
      paymentSettings.stripeAccountStatus === 'active' ||
      paymentSettings.detailsSubmitted === true,
    enablePublicWebsite:
      onboardingSettings.enablePublicWebsite === true ||
      websiteSettings.onboardingRequested === true ||
      league.is_public === true,
    wantCustomDomain:
      onboardingSettings.wantCustomDomain === true ||
      domainSettings.wantCustomDomain === true ||
      !!domainSettings.customDomainName,
  });

  const pendingActions = [
    pendingRegistrations && {
      label: `${pendingRegistrations} pending registration${pendingRegistrations === 1 ? '' : 's'}`,
      href: currentSeason
        ? `${buildSeasonWorkspaceHref(locale, leagueId, currentSeason.id, 'registrations')}?status=pending`
        : buildLeagueSeasonsHref(locale, leagueId),
    },
    pendingGames && {
      label: `${pendingGames} game${pendingGames === 1 ? '' : 's'} awaiting verification`,
      href: currentSeason
        ? buildSeasonWorkspaceHref(locale, leagueId, currentSeason.id, 'games')
        : buildLeagueSeasonsHref(locale, leagueId),
    },
    activeSuspensions && {
      label: `${activeSuspensions} active suspension${activeSuspensions === 1 ? '' : 's'}`,
      href: currentSeason
        ? buildSeasonWorkspaceHref(locale, leagueId, currentSeason.id, 'games')
        : buildLeagueSeasonsHref(locale, leagueId),
    },
    unreadMessages && {
      label: `${unreadMessages} unread contact message${unreadMessages === 1 ? '' : 's'}`,
      href: `/${locale}/dashboard/leagues/${leagueId}/contact-inbox`,
    },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const primaryActionHref = localizeHref(
    locale,
    leagueChecklist.nextActionHref ||
      (currentSeason
        ? buildSeasonWorkspaceHref('', leagueId, currentSeason.id)
        : `${buildLeagueSeasonsHref('', leagueId)}/new`)
  );
  const primaryActionLabel =
    currentSeason && leagueChecklist.nextActionHref === buildLeagueSeasonsHref('', leagueId)
      ? `Open ${currentSeason.name}`
      : leagueChecklist.nextActionLabel || (currentSeason ? `Open ${currentSeason.name}` : 'Create first season');

  const primaryReadinessCards = [
    {
      eyebrow: 'Payments',
      title:
        paymentSettings.stripeAccountStatus === 'connected' || paymentSettings.detailsSubmitted
          ? 'Stripe is ready'
          : 'Stripe still needs setup',
      description:
        paymentSettings.stripeAccountStatus === 'connected' || paymentSettings.detailsSubmitted
          ? 'Online payments can be enabled from the finance workspace.'
          : 'Connect Stripe before registrations need to collect league fees online.',
      href: `/${locale}/dashboard/leagues/${leagueId}/integrations`,
      cta:
        paymentSettings.stripeAccountStatus === 'connected' || paymentSettings.detailsSubmitted
          ? 'Review integrations'
          : 'Connect Stripe',
    },
    {
      eyebrow: 'Waivers',
      title: signedWaiversTotal > 0 ? 'Waivers are active' : 'Waiver setup still needs review',
      description:
        signedWaiversTotal > 0
          ? `${signedWaiversTotal} signed waiver${signedWaiversTotal === 1 ? '' : 's'} already tracked for this league.`
          : 'Configure the waiver template before player registrations go live.',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/waiver`,
      cta: signedWaiversTotal > 0 ? 'Review waivers' : 'Set waiver rules',
    },
    {
      eyebrow: 'Staffing',
      title: currentSeason ? 'Staffing belongs to the active season' : 'No active season for staffing yet',
      description: currentSeason
        ? 'Use the season workspace and More Tools when referees, scorekeepers, or other staff need assignment.'
        : 'Create a season first, then assign game-day staff inside that workspace.',
      href: currentSeason
        ? buildSeasonWorkspaceHref(locale, leagueId, currentSeason.id, 'scorekeepers')
        : buildLeagueSeasonsHref(locale, leagueId),
      cta: currentSeason ? 'Open staffing tools' : 'Create season first',
    },
  ];

  const secondaryWorkspaces = [
    {
      eyebrow: 'Content',
      title: 'Social graphics workspace is ready',
      description:
        'Keep score cards, weekly recap concepts, standings graphics, and future social export flows in one league-scoped portal page.',
      href: `/${locale}/dashboard/leagues/${leagueId}/social`,
      cta: 'Open social graphics',
    },
    {
      eyebrow: 'Email and Domain',
      title:
        domainSettings.customDomainName || websiteSettings.onboardingRequested
          ? 'Branding is in progress'
          : 'Domain and sender setup are still open',
      description:
        domainSettings.customDomainName
          ? `Custom domain request: ${domainSettings.customDomainName}`
          : 'Set a sender domain and website domain from one place when you are ready to publish outward.',
      href: `/${locale}/dashboard/leagues/${leagueId}/settings/email-domain`,
      cta: 'Open domain setup',
    },
    {
      eyebrow: 'Migration',
      title: 'Migration center is ready',
      description:
        'Imports for teams, players, schedules, and historical cleanup now live in one guided destination.',
      href: `/${locale}/dashboard/leagues/${leagueId}/migration-center`,
      cta: 'Open migration center',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/${locale}/dashboard/leagues`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToLeagues')}
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <LeagueLogo
                logoUrl={league.logo_url}
                leagueName={league.name}
                primaryColor={league.primary_color || '#22D3EE'}
                size="lg"
                shape="square"
                bordered
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rink-300/80">
                  League Hub
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">{league.name}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-300">
                  This page is now the orientation surface for league setup, finance, content, and
                  integrations. Day-to-day operations should happen from a season workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AnnouncementComposerButton leagueId={leagueId} leagueName={league.name} />
              <span
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-semibold',
                  league.status === 'active'
                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                    : league.status === 'draft'
                      ? 'border-amber-400/20 bg-amber-500/10 text-amber-200'
                      : 'border-white/[0.10] bg-white/[0.05] text-neutral-300'
                )}
              >
                {(league.status || 'active').charAt(0).toUpperCase() + (league.status || 'active').slice(1)}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            <LeagueMetricCard label={t('teams')} value={teamsCount || 0} icon={<Users className="h-4 w-4" />} />
            <LeagueMetricCard label={t('divisions')} value={divisionsCount || 0} icon={<LayoutGrid className="h-4 w-4" />} />
            <LeagueMetricCard label={t('seasons')} value={league.seasons?.length || 0} icon={<Calendar className="h-4 w-4" />} />
            <LeagueMetricCard label={t('location')} value={`${league.city || t('unknown')}${league.city && league.state_province ? ', ' : ''}${league.state_province || ''}`} icon={<Globe className="h-4 w-4" />} />
            <LeagueMetricCard label={t('timezone')} value={league.timezone || t('notSet')} icon={<Settings className="h-4 w-4" />} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={primaryActionHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-rink-500 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-rink-400"
            >
              {primaryActionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={buildLeagueSeasonsHref(locale, leagueId)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]"
            >
              View all seasons
            </Link>
          </div>
        </section>

        {pendingActions.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-semibold">League alerts</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {pendingActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="rounded-full border border-amber-400/20 bg-black/15 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-black/25"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SetupChecklistCard checklist={leagueChecklist} locale={locale} />

          <div className="space-y-6">
            <SummarySurface
              eyebrow="Current workspace"
              title={currentSeason ? currentSeason.name : 'No active season yet'}
              description={
                currentSeason
                  ? `${getSeasonStatusLabel(currentSeason.status, currentSeason.registration_type)} status. Open this workspace for registrations, teams, schedules, and games.`
                  : 'Create the first season to unlock the operating workspace.'
              }
              icon={<Play className="h-4 w-4" />}
            />
            <SummarySurface
              eyebrow="Connections"
              title={paymentSettings.stripeAccountStatus === 'connected' || paymentSettings.detailsSubmitted ? 'Stripe connected' : 'Stripe still needs review'}
              description={
                websiteSettings.onboardingRequested || league.is_public
                  ? 'Website publishing is enabled for this league.'
                  : 'Public website publishing is currently optional.'
              }
              icon={<PlugZap className="h-4 w-4" />}
            />
            <SummarySurface
              eyebrow="Compliance"
              title={signedWaiversTotal > 0 ? `${signedWaiversTotal} signed waiver${signedWaiversTotal === 1 ? '' : 's'}` : 'No signed waivers yet'}
              description="Waiver setup and signatures stay visible here, but the actual waiver tool now lives in league settings."
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Critical Systems
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">League readiness</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Each core system has one status, one next step, and one place to manage it.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {primaryReadinessCards.map((card) => (
              <ReadinessCard key={card.eyebrow} {...card} />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div>
            <h2 className="text-lg font-bold text-white">Supporting workspaces</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Secondary publishing and cleanup surfaces stay available here without crowding the core season workflow.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {secondaryWorkspaces.map((card) => (
              <ReadinessCard key={card.eyebrow} {...card} subtle />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Seasons
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">Season workspaces</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Open a season for operations, or create the next one without leaving the league scope.
              </p>
            </div>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/seasons/new`}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]"
            >
              <Calendar className="h-4 w-4" />
              {t('newSeason')}
            </Link>
          </div>

          {league.seasons && league.seasons.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {league.seasons.map((season: any) => (
                <SeasonCard key={season.id} season={season} leagueId={leagueId} locale={locale} t={t} />
              ))}
            </div>
          ) : (
            <div className="surface-premium mt-5 p-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-rink-400" />
              <h3 className="mt-4 text-xl font-bold text-white">{t('noSeasonsYet')}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-neutral-400">
                Create the first season to unlock the season workspace and checklist-driven launch flow.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function LeagueMetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-black/20 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-neutral-400">
        <span className="rounded-xl bg-rink-500/10 p-2 text-rink-300">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-4 truncate text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function SummarySurface({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'surface-premium p-5',
        tone === 'primary' && 'border-rink-400/15 bg-[linear-gradient(145deg,rgba(34,211,238,0.10),rgba(255,255,255,0.03))]'
      )}
    >
      <div className="flex items-center gap-2 text-neutral-400">
        <span className="rounded-xl bg-rink-500/10 p-2 text-rink-300">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{eyebrow}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-neutral-400">{description}</p>
    </div>
  );
}

function ReadinessCard({
  eyebrow,
  title,
  description,
  href,
  cta,
  subtle = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  subtle?: boolean;
}) {
  return (
<<<<<<< HEAD
    <div className="surface-premium p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-neutral-400">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-rink-400/20 bg-rink-500/10 px-4 py-2 text-sm font-semibold text-rink-200 transition-colors hover:bg-rink-500/20"
=======
    <div className={cn(
      'rounded-xl border p-5',
      subtle
        ? 'border-white/[0.05] bg-white/[0.015]'
        : 'border-white/[0.06] bg-white/[0.02]'
    )}>
      <p className="text-xs font-medium text-neutral-500">{eyebrow}</p>
      <h3 className="mt-2 text-base font-bold text-white">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
      <Link
        href={href}
        className={cn(
          'mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
          subtle
            ? 'border-white/[0.06] bg-white/[0.02] text-neutral-400 hover:bg-white/[0.04]'
            : 'border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.06]'
        )}
>>>>>>> 41c8f6a3 (refactor: demote secondary dashboard surfaces)
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function SeasonCard({ season, leagueId, locale, t }: { season: any; leagueId: string; locale: string; t: any }) {
  const statusColors: Record<string, string> = {
    active: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
    draft: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    completed: 'border-white/[0.10] bg-white/[0.05] text-neutral-300',
    playoffs: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
  };

  return (
    <div className="surface-premium p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">{season.name}</h3>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(season.start_date).toLocaleDateString()} -{' '}
            {season.end_date ? new Date(season.end_date).toLocaleDateString() : t('ongoing')}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs font-semibold',
            statusColors[season.status] || statusColors.draft
          )}
        >
          {getSeasonStatusLabel(season.status, season.registration_type)}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/${locale}/dashboard/leagues/${leagueId}/seasons/${season.id}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-rink-500/10 px-4 py-2 text-sm font-semibold text-rink-200 transition-colors hover:bg-rink-500/20"
        >
          <Play className="h-4 w-4" />
          Open workspace
        </Link>
        <Link
          href={`/${locale}/dashboard/leagues/${leagueId}/seasons/${season.id}/edit`}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]"
        >
          <Settings className="h-4 w-4" />
          Edit season
        </Link>
      </div>
    </div>
  );
}
