import Link from 'next/link';
import { ArrowRight, Camera, ChevronRight, Clock3, Trophy } from 'lucide-react';
import { HomepageLeadersTabs } from '@/components/home/HomepageLeadersTabs';
import type {
  GoalieStatsWithDivision,
  HomepageSeasonLeader,
  RecentGame,
} from '@/lib/types';
import { formatLeagueShortDate } from '@/lib/league-timezone';

interface GallerySpotlight {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  href: string;
  cta: string;
}

interface RegistrationSpotlight {
  type: 'registration';
  seasonName: string;
  href: string;
  opensAt?: string | null;
  closesAt?: string | null;
}

interface ResultsSpotlight {
  type: 'results';
  title: string;
  href: string;
  games: RecentGame[];
}

interface GallerySpotlightCard {
  type: 'gallery';
  title: string;
  highlight: GallerySpotlight;
}

type HomepageSeasonSpotlight = RegistrationSpotlight | ResultsSpotlight | GallerySpotlightCard;

interface HomepageSeasonBandProps {
  leagueSlug: string;
  leadersEyebrow: string;
  leadersSeasonName?: string | null;
  leadersDescription: string;
  scoringLeaders: HomepageSeasonLeader[];
  goalieLeaders: GoalieStatsWithDivision[];
  spotlight: HomepageSeasonSpotlight | null;
  timezone?: string | null;
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return 'TBD';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'TBD';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getRegistrationProgress(opensAt?: string | null, closesAt?: string | null) {
  const now = new Date();
  const open = opensAt ? new Date(opensAt) : null;
  const close = closesAt ? new Date(closesAt) : null;

  if (!open || Number.isNaN(open.getTime()) || !close || Number.isNaN(close.getTime()) || close <= open) {
    return 0.62;
  }

  if (now <= open) {
    return 0;
  }

  if (now >= close) {
    return 1;
  }

  return (now.getTime() - open.getTime()) / (close.getTime() - open.getTime());
}

function MiniTeamLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/85">
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-black text-[var(--league-primary)]">{name.charAt(0)}</span>
      )}
    </div>
  );
}

function RegistrationCard({ spotlight }: { spotlight: RegistrationSpotlight }) {
  const progress = getRegistrationProgress(spotlight.opensAt, spotlight.closesAt);

  return (
    <section className="league-shell-panel self-start rounded-[28px] border border-[var(--color-border)] px-4 py-4 md:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
            Registration Timeline
          </p>
          <h3 className="mt-1.5 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
            {spotlight.seasonName}
          </h3>
        </div>
        <div className="rounded-xl bg-[var(--league-primary)]/12 p-2 text-[var(--league-primary)]">
          <Clock3 className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/72 p-3.5">
        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <span>Open</span>
          <span>Now</span>
          <span>Close</span>
        </div>
        <div className="relative mt-2.5 h-1.5 rounded-full bg-[var(--color-surface-hover)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--league-primary)]"
            style={{ width: `${Math.max(progress * 100, 12)}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/75 px-2.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Open</p>
            <p className="mt-1.5 text-xs font-bold text-[var(--color-text-primary)]">{formatShortDate(spotlight.opensAt)}</p>
          </div>
          <div className="rounded-xl border border-[var(--league-primary)]/28 bg-[var(--league-primary)]/10 px-2.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--league-primary)]">Live</p>
            <p className="mt-1.5 text-xs font-bold text-[var(--color-text-primary)]">Register</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/75 px-2.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Close</p>
            <p className="mt-1.5 text-xs font-bold text-[var(--color-text-primary)]">{formatShortDate(spotlight.closesAt)}</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-5 text-[var(--color-text-secondary)]">
        Registration is open now. Secure your spot before the window closes.
      </p>

      <Link
        href={spotlight.href}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--league-primary)] px-3.5 py-2.5 text-sm font-bold text-[var(--color-accent-text)] transition-transform duration-200 hover:-translate-y-0.5"
      >
        Register Now
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function ResultsCard({ leagueSlug, spotlight, timezone }: { leagueSlug: string; spotlight: ResultsSpotlight; timezone?: string | null }) {
  return (
    <section className="league-shell-panel self-start rounded-[28px] border border-[var(--color-border)] px-4 py-4 md:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
            Recent Scores
          </p>
          <h3 className="mt-1.5 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
            {spotlight.title}
          </h3>
        </div>
        <div className="rounded-xl bg-[var(--league-primary)]/12 p-2 text-[var(--league-primary)]">
          <Trophy className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {spotlight.games.slice(0, 2).map((game) => (
          <Link
            key={game.id}
            href={`/${leagueSlug}/games/${game.id}`}
            className="flex items-center gap-2.5 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)]/72 px-3 py-3 transition-colors duration-200 hover:border-[var(--league-primary)]"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <MiniTeamLogo name={game.away_team?.name || 'Away'} logoUrl={game.away_team?.logo} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{game.away_team?.name || 'Away'}</p>
                <p className="truncate text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {formatLeagueShortDate(game.scheduled_at, timezone)}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-black leading-none text-[var(--color-text-primary)]">{game.away_score ?? '-'}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">AT</p>
              <p className="mt-1 text-lg font-black leading-none text-[var(--color-text-primary)]">{game.home_score ?? '-'}</p>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{game.home_team?.name || 'Home'}</p>
                <p className="truncate text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {game.venue || 'League venue'}
                </p>
              </div>
              <MiniTeamLogo name={game.home_team?.name || 'Home'} logoUrl={game.home_team?.logo} />
            </div>
          </Link>
        ))}
      </div>

      <Link
        href={spotlight.href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--league-primary)]"
      >
        All Scores
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function GalleryCard({ spotlight }: { spotlight: GallerySpotlightCard }) {
  return (
    <section className="relative self-start overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="absolute inset-0">
        {spotlight.highlight.imageUrl ? (
          <img src={spotlight.highlight.imageUrl} alt={spotlight.highlight.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--league-primary)_26%,transparent),transparent_54%),linear-gradient(180deg,var(--color-surface),color-mix(in_srgb,var(--color-surface)_78%,black))]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.48)_45%,rgba(0,0,0,0.84)_100%)]" />
      </div>

      <div className="relative flex min-h-[240px] flex-col justify-end p-4 md:p-5">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
          <Camera className="h-3.5 w-3.5" />
          Photo Gallery
        </div>
        <h3 className="mt-2.5 text-[1.65rem] font-black tracking-tight text-white">{spotlight.highlight.title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-5 text-white/78">{spotlight.highlight.subtitle}</p>
        <Link
          href={spotlight.highlight.href}
          className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-3.5 py-2.5 text-sm font-bold text-slate-950 transition-transform duration-200 hover:-translate-y-0.5"
        >
          {spotlight.highlight.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export function HomepageSeasonBand({
  leagueSlug,
  leadersEyebrow,
  leadersSeasonName,
  leadersDescription,
  scoringLeaders,
  goalieLeaders,
  spotlight,
  timezone,
}: HomepageSeasonBandProps) {
  const hasLeaders = scoringLeaders.length > 0 || goalieLeaders.length > 0;

  if (!spotlight && !hasLeaders) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 pt-6">
      <div className={`grid items-start gap-4 ${spotlight && hasLeaders ? 'xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]' : ''}`}>
        {spotlight &&
          (spotlight.type === 'registration' ? (
            <RegistrationCard spotlight={spotlight} />
          ) : spotlight.type === 'results' ? (
            <ResultsCard leagueSlug={leagueSlug} spotlight={spotlight} timezone={timezone} />
          ) : (
            <GalleryCard spotlight={spotlight} />
          ))}

        {hasLeaders && (
          <section className="league-shell-panel self-start rounded-[28px] border border-[var(--color-border)] px-4 py-4 md:px-5 md:py-5">
            <HomepageLeadersTabs
              leagueSlug={leagueSlug}
              eyebrow={leadersEyebrow}
              seasonName={leadersSeasonName}
              description={leadersDescription}
              scoringLeaders={scoringLeaders}
              goalieLeaders={goalieLeaders}
            />
          </section>
        )}
      </div>
    </section>
  );
}

export default HomepageSeasonBand;
