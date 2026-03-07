import { CalendarDays, Clock3 } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { LineupRinkBoard } from '@/components/lineups/LineupRinkBoard';
import type { PublishedGameTeamLineup } from '@/lib/lineups/types';

function formatPublishedTime(value: string | null) {
  if (!value) return 'Saved recently';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function GameLineupsSection({
  lineups,
  homeTeamId,
  awayTeamId,
}: {
  lineups: PublishedGameTeamLineup[];
  homeTeamId: string;
  awayTeamId: string;
}) {
  if (lineups.length === 0) {
    return null;
  }

  const orderedLineups = [...lineups].sort((left, right) => {
    const leftRank = left.teamId === homeTeamId ? 0 : left.teamId === awayTeamId ? 1 : 2;
    const rightRank = right.teamId === homeTeamId ? 0 : right.teamId === awayTeamId ? 1 : 2;
    return leftRank - rightRank;
  });

  return (
    <section className="container mx-auto px-4 pt-8">
      <div className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_28px_90px_rgba(15,23,42,0.16)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
              Game Day Lineups
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
              Captains have published tonight&apos;s look
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              Built from game-day check-ins and shared by each captain before puck drop.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            <CalendarDays className="h-3.5 w-3.5 text-[var(--league-primary)]" />
            {lineups.length} published
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {orderedLineups.map((lineup) => (
            <article
              key={lineup.id}
              className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 sm:p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <TeamLogo
                    logoUrl={lineup.team.logoUrl}
                    teamName={lineup.team.name}
                    teamColor={lineup.team.primaryColor || 'var(--league-primary)'}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-[var(--color-text-primary)]">
                      {lineup.team.name}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      {lineup.formation ? lineup.formation.replace(/-/g, ' ') : 'Game day layout'}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <Clock3 className="h-3.5 w-3.5 text-[var(--league-primary)]" />
                  {formatPublishedTime(lineup.publishedAt || lineup.updatedAt)}
                </div>
              </div>

              <LineupRinkBoard
                layout={lineup.layout}
                teamName={lineup.team.name}
                accentColor={lineup.team.primaryColor}
                className="border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
                emptyLabel="No skaters placed on the rink yet."
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
