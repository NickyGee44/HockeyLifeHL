import { getCurrentUser } from '@/lib/actions/auth';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { getLeagueMigrationRequests } from '@/lib/actions/migration-requests';
import { getMigrationFee } from '@/lib/fees/platform-fees';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@hockey-life/ui';
import { Link } from '@/i18n/navigation';
import { MigrationRequestIntake } from '@/components/migration/MigrationRequestIntake';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Database,
  FileText,
  Image,
  Newspaper,
  Upload,
  Users,
} from 'lucide-react';
import { LeagueLogo } from '@/components/ui/league-logo';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type SeasonSnapshot = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule_generated: boolean | null;
};

export default async function LeagueMigrationCenterPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    nextRedirect(`/${locale}/dashboard`);
  }

  const supabase = await createClient();

  const [
    { data: league, error: leagueError },
    { count: teamsCount },
    { count: divisionsCount },
    { data: seasons },
    { data: articles },
    { data: galleryAlbums },
    { count: awardsCount },
    { count: playerStatsCount },
    { count: goalieStatsCount },
    migrationFee,
  ] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, name, status, description, logo_url, primary_color')
      .eq('id', leagueId)
      .single(),
    supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .neq('status', 'inactive'),
    supabase
      .from('divisions')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId),
    supabase
      .from('seasons')
      .select('id, name, status, start_date, end_date, schedule_generated')
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false }),
    (supabase.from('articles') as any)
      .select('id, published, created_at')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false }),
    (supabase.from('league_gallery') as any)
      .select('id, title, created_at, gallery_photos(count)')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false }),
    (supabase.from('league_awards') as any)
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId),
    supabase
      .from('player_stats')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId),
    supabase
      .from('goalie_stats')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId),
    getMigrationFee(),
  ]);

  if (leagueError || !league) {
    notFound();
  }

  const seasonList = (seasons ?? []) as SeasonSnapshot[];
  const currentSeason = pickCurrentSeason(seasonList);
  const articleCount = articles?.length ?? 0;
  const publishedArticles = (articles ?? []).filter((article: any) => article.published).length;
  const albumCount = galleryAlbums?.length ?? 0;
  const photoCount = (galleryAlbums ?? []).reduce(
    (sum: number, album: any) => sum + (album.gallery_photos?.[0]?.count ?? 0),
    0
  );
  const statsRecordCount = (playerStatsCount ?? 0) + (goalieStatsCount ?? 0);
  const migrationRequestsResult = await getLeagueMigrationRequests(leagueId);
  const migrationRequests = migrationRequestsResult.success ? migrationRequestsResult.data : [];

  const tracks = [
    {
      title: 'League setup',
      icon: <Users className="w-5 h-5" />,
      tone: teamsCount || divisionsCount || seasonList.length ? 'active' : 'empty',
      summary: `${teamsCount ?? 0} teams, ${divisionsCount ?? 0} divisions, ${seasonList.length} seasons`,
      description:
        'This is the easiest place to start. Teams, divisions, seasons, and schedules already have working tools inside the builder.',
      href: `/dashboard/leagues/${leagueId}/teams?tool=import-teams`,
      cta: 'Start with teams',
      detail: currentSeason
        ? `${currentSeason.name} is the best starting point for current-season imports.`
        : 'Create a season first, then import teams, players, and the schedule.',
    },
    {
      title: 'Stats, champions, and awards',
      icon: <Database className="w-5 h-5" />,
      tone: statsRecordCount > 0 || (awardsCount ?? 0) > 0 ? 'active' : 'assisted',
      summary: `${playerStatsCount ?? 0} skater rows, ${goalieStatsCount ?? 0} goalie rows, ${awardsCount ?? 0} awards`,
      description:
        'Older stats, champions, award winners, and record books are best handled through a migration request. You do not need to clean everything up first.',
      href: `/dashboard/leagues/${leagueId}/migration-center#migration-intake`,
      cta: 'Request help with history',
      detail: 'Share whatever you have: spreadsheets, PDFs, exported reports, or a link to the old site.',
    },
    {
      title: 'News archive',
      icon: <Newspaper className="w-5 h-5" />,
      tone: articleCount > 0 ? 'active' : 'assisted',
      summary: `${articleCount} articles, ${publishedArticles} published`,
      description:
        'You can write new articles today. If you want years of old stories moved over, that is part of the assisted migration flow.',
      href: `/dashboard/leagues/${leagueId}/news`,
      cta: 'Open news workspace',
      detail: 'A site link, export, or spreadsheet with titles and publish dates is enough for us to review.',
    },
    {
      title: 'Photos and media',
      icon: <Image className="w-5 h-5" />,
      tone: albumCount > 0 || photoCount > 0 ? 'active' : 'assisted',
      summary: `${albumCount} albums, ${photoCount} photos`,
      description:
        'Gallery tools already exist. Large photo and video libraries from the old site are still best handled as a guided migration.',
      href: `/dashboard/leagues/${leagueId}/gallery`,
      cta: 'Open gallery workspace',
      detail: 'If you can group folders by season or event, the move will go faster, but it does not need to be perfect.',
    },
  ] as const;

  const selfServeActions = [
    {
      title: 'Import teams',
      description: 'Upload teams, divisions, and captain emails with the existing template.',
      href: `/dashboard/leagues/${leagueId}/teams?tool=import-teams`,
      icon: <Upload className="w-5 h-5" />,
    },
    {
      title: 'Import players',
      description: currentSeason
        ? `Bulk import players into ${currentSeason.name}.`
        : 'Create a season first, then use player import from registrations.',
      href: currentSeason
        ? `/dashboard/leagues/${leagueId}/registrations?season=${currentSeason.id}&tool=import-players`
        : `/dashboard/leagues/${leagueId}/seasons/new`,
      icon: <Users className="w-5 h-5" />,
      disabled: !currentSeason,
    },
    {
      title: 'Import schedule',
      description: currentSeason
        ? 'Open the schedule importer directly inside season schedule tools.'
        : 'Create a season first, then import or generate the schedule.',
      href: currentSeason
        ? `/dashboard/leagues/${leagueId}/schedule?season=${currentSeason.id}&tool=import-schedule`
        : `/dashboard/leagues/${leagueId}/seasons/new`,
      icon: <Calendar className="w-5 h-5" />,
      disabled: !currentSeason,
    },
    {
      title: 'Set up awards',
      description: 'Create awards now and use this as the home for past winners.',
      href: `/dashboard/leagues/${leagueId}/awards`,
      icon: <Award className="w-5 h-5" />,
    },
    {
      title: 'Write news now',
      description: 'Start publishing right away while older stories are reviewed for import.',
      href: `/dashboard/leagues/${leagueId}/news`,
      icon: <Newspaper className="w-5 h-5" />,
    },
    {
      title: 'Set up photo albums',
      description: 'Create albums now so old photos and videos have a clear destination.',
      href: `/dashboard/leagues/${leagueId}/gallery`,
      icon: <Image className="w-5 h-5" />,
    },
  ];

  const prepBundles = [
    {
      title: 'Stats and records',
      items: [
        'Player or goalie stat exports by season if you have them',
        'Championship winners, standings, and award history',
        'Any player IDs or roster mapping files from the old system',
        'PDFs or screenshots are still useful if exports do not exist',
      ],
    },
    {
      title: 'News archive',
      items: [
        'A site link or export with story titles and publish dates',
        'Article body, excerpts, and any author names you want to keep',
        'Hero images or links to where those images live',
        'Old URLs if you want redirects preserved',
      ],
    },
    {
      title: 'Photos and media',
      items: [
        'Folders grouped by season, tournament, or event if possible',
        'Captions, dates, or descriptions in any spreadsheet you already have',
        'Separate videos from photo albums when you can',
        'Shared-drive or cloud-storage links are fine',
      ],
    },
  ];

  const startHereSteps = [
    {
      title: '1. Move the basics first',
      description: 'Use the self-serve tools for teams, players, and schedules.',
      icon: <Upload className="w-4 h-4" />,
    },
    {
      title: '2. Request help with old history',
      description: 'Use the short intake form for stats, champions, news, and media archives.',
      icon: <Database className="w-4 h-4" />,
    },
    {
      title: '3. Track everything here',
      description: 'The page keeps your latest request status and updates in one place.',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
  ] as const;

  const assistedAreas = [
    {
      title: 'Older stats and record books',
      description:
        'If your old site has player totals, goalie totals, champions, or award winners, include them in the request and we will review the source format.',
    },
    {
      title: 'Years of past news stories',
      description:
        'New articles are self-serve. Moving years of old posts with dates, slugs, and images still needs a guided backfill.',
    },
    {
      title: 'Large photo and video libraries',
      description:
        'If you have old season folders, event galleries, or mixed archives, we will help organize the move into albums.',
    },
  ] as const;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="space-y-4">
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.035),transparent)] pointer-events-none" />
            <div className="relative grid gap-8 xl:grid-cols-[1.4fr_0.9fr] xl:items-start">
              <div>
                <div className="flex flex-wrap items-start gap-4 mb-5">
                  <LeagueLogo
                    logoUrl={league.logo_url}
                    leagueName={league.name}
                    primaryColor={league.primary_color || '#22D3EE'}
                    size="lg"
                    shape="square"
                    bordered
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80 mb-3">
                      Historical Data
                    </p>
                    <h1 className="text-3xl sm:text-[2.6rem] leading-tight font-black text-white tracking-tight">
                      Bring your old league history into {league.name}
                    </h1>
                    <p className="text-neutral-300 mt-3 max-w-3xl leading-7">
                      Use the working import tools for teams, players, and schedules. If you need older stats, champions, articles, or galleries moved over too, this page keeps that process simple and visible.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Teams" value={teamsCount ?? 0} icon={<Users className="w-4 h-4" />} />
                  <MetricCard label="Seasons" value={seasonList.length} icon={<Calendar className="w-4 h-4" />} />
                  <MetricCard label="Articles" value={articleCount} icon={<Newspaper className="w-4 h-4" />} />
                  <MetricCard label="Photo Assets" value={photoCount} icon={<Image className="w-4 h-4" />} />
                </div>
              </div>

              <div className="rounded-[26px] border border-cyan-400/20 bg-black/20 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <BarChart3 className="w-4 h-4 text-cyan-300" />
                  How this works
                </div>
                <div className="space-y-3">
                  {startHereSteps.map((step) => (
                    <div key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200">
                          {step.icon}
                        </span>
                        {step.title}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-neutral-300">{step.description}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Assisted Migration Pricing
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {formatMoney(migrationFee.cents)}
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">{migrationFee.label}</p>
                  <p className="text-xs text-neutral-500 mt-2">
                    This is the usual starting point for historical import work. Larger or messier archives may still need a custom quote after review.
                  </p>
                </div>
                <a
                  href="#migration-intake"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition-[border-color,background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-400/15"
                >
                  Start the request
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <MigrationRequestIntake
          leagueId={leagueId}
          locale={locale}
          requests={migrationRequests}
        />

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Best path for each part of your history</h2>
            <p className="text-sm text-neutral-400 mt-1">
              We checked what already exists in this league and mapped each area to the easiest next step.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {tracks.map((track) => (
              <MigrationTrackCard key={track.title} {...track} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">Do these yourself today</h2>
              <p className="text-sm text-neutral-400 mt-1">
                These are the fastest working actions already live in the builder.
              </p>
            </div>
            {currentSeason && (
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-300">
                Current season: {currentSeason.name}
              </div>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {selfServeActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className={cn(
                  'rounded-[24px] border px-5 py-5 transition-[border-color,background-color,color,transform] duration-200',
                  action.disabled
                    ? 'pointer-events-none border-white/10 bg-white/[0.02] text-neutral-500'
                    : 'border-white/10 bg-white/[0.04] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={cn('text-base font-semibold', action.disabled ? 'text-neutral-500' : 'text-white')}>
                      {action.title}
                    </p>
                    <p className="text-sm text-neutral-400 mt-2 leading-6">{action.description}</p>
                  </div>
                  <span className={cn(
                    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                    action.disabled ? 'bg-white/[0.03] text-neutral-600' : 'bg-rink-500/10 text-rink-300'
                  )}>
                    {action.icon}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-white mb-4">
              <FileText className="w-5 h-5 text-rink-300" />
              <h2 className="text-xl font-bold">Helpful files to gather</h2>
            </div>
            <p className="text-sm text-neutral-400 mb-5">
              You do not need a perfect export. These are just the most useful files to share if you already have them.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {prepBundles.map((bundle) => (
                <div key={bundle.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">{bundle.title}</h3>
                  <ul className="space-y-2 text-sm text-neutral-300">
                    {bundle.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-rink-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-amber-400/20 bg-[linear-gradient(160deg,rgba(245,158,11,0.14),rgba(255,255,255,0.03))] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-white mb-4">
              <AlertCircle className="w-5 h-5 text-amber-300" />
              <h2 className="text-xl font-bold">We will handle these with you</h2>
            </div>
            <div className="space-y-4 text-sm text-neutral-200">
              {assistedAreas.map((area) => (
                <div key={area.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-semibold text-white">{area.title}</p>
                  <p className="text-neutral-300 mt-2 leading-6">{area.description}</p>
                </div>
              ))}
            </div>
            <a
              href="#migration-intake"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 transition-[border-color,background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-amber-200/40 hover:bg-amber-300/15"
            >
              Ask for migration help
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-rink-500/10 text-rink-300">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function MigrationTrackCard({
  title,
  summary,
  description,
  detail,
  href,
  cta,
  tone,
  icon,
}: {
  title: string;
  summary: string;
  description: string;
  detail: string;
  href: string;
  cta: string;
  tone: 'active' | 'assisted' | 'empty';
  icon: React.ReactNode;
}) {
  const toneClasses = {
    active: 'border-emerald-400/20 bg-emerald-400/8 text-emerald-200',
    assisted: 'border-amber-400/20 bg-amber-400/8 text-amber-100',
    empty: 'border-white/10 bg-white/[0.03] text-neutral-200',
  } as const;

  const badgeLabels = {
    active: 'Already has data',
    assisted: 'Best with help',
    empty: 'Ready to import',
  } as const;

  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-white mb-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rink-500/10 text-rink-300">
              {icon}
            </span>
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          <p className="text-sm text-neutral-300">{summary}</p>
        </div>
        <span className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold', toneClasses[tone])}>
          {badgeLabels[tone]}
        </span>
      </div>
      <p className="text-sm text-neutral-400 leading-6">{description}</p>
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 mb-2">
          Best next step
        </p>
        <p className="text-sm text-neutral-300 leading-6">{detail}</p>
      </div>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-rink-300 hover:text-rink-200 transition-colors"
      >
        {cta}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function pickCurrentSeason(seasons: SeasonSnapshot[]) {
  if (seasons.length === 0) return null;

  const priority: Record<string, number> = {
    active: 0,
    registration: 1,
    draft: 2,
    completed: 3,
    archived: 4,
  };

  return [...seasons].sort((a, b) => {
    const priorityDelta = (priority[a.status ?? ''] ?? 99) - (priority[b.status ?? ''] ?? 99);
    if (priorityDelta !== 0) return priorityDelta;
    const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
    const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
    return bDate - aDate;
  })[0] ?? null;
}

function formatMoney(cents: number) {
  if (!cents || cents <= 0) return 'Custom quote';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
