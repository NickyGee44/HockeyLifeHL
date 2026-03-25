import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { HomepageSeasonLeader } from '@/lib/types';

interface HomepagePreviousSeasonLeadersProps {
  leagueSlug: string;
  seasonName: string | null;
  leaders: HomepageSeasonLeader[];
}

function LeaderCard({
  leagueSlug,
  leader,
  rank,
}: {
  leagueSlug: string;
  leader: HomepageSeasonLeader;
  rank: number;
}) {
  return (
    <Link
      href={`/${leagueSlug}/players/${leader.player_id}`}
      className="group flex items-center gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/72 px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--league-primary)]"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
          rank === 1
            ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
            : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
        }`}
      >
        {rank}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/90">
          {leader.avatar_url ? (
            <img src={leader.avatar_url} alt={leader.player_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-black text-[var(--league-primary)]">{leader.player_name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 group-hover:text-[var(--league-primary)]">
            {leader.player_name}
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {leader.division_name ? `${leader.division_name} | ${leader.team_name}` : leader.team_name}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-black leading-none text-[var(--color-text-primary)]">{leader.points}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">PTS</p>
      </div>
    </Link>
  );
}

export function HomepagePreviousSeasonLeaders({
  leagueSlug,
  seasonName,
  leaders,
}: HomepagePreviousSeasonLeadersProps) {
  if (leaders.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 pt-6">
      <div className="league-shell-panel rounded-[30px] border border-[var(--color-border)] px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
              Previous Season
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
              {seasonName ? `${seasonName} points leaders` : 'Top scorers from last season'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
              A quick look back at the players who finished last season at the top of the scoring race.
            </p>
          </div>
          <Link
            href={`/${leagueSlug}/stats`}
            className="group inline-flex items-center gap-1 text-sm font-semibold text-[var(--league-primary)]"
          >
            Full Stats
            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {leaders.slice(0, 3).map((leader, index) => (
            <LeaderCard
              key={`${leader.player_id}-${leader.team_id}-${index}`}
              leagueSlug={leagueSlug}
              leader={leader}
              rank={index + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default HomepagePreviousSeasonLeaders;
