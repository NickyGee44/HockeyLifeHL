import { CalendarDays, Clock3, Users } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { SectionHeading } from '@/components/shared';
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeading
          title="Game Day Lineups"
          icon={<Users className="w-5 h-5 text-[var(--league-primary)]" />}
        />
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
          <CalendarDays className="h-3.5 w-3.5 text-[var(--league-primary)]" />
          {lineups.length} published
        </div>
      </div>

      <div className="glass-card-strong mt-4 rounded-[32px] p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-2">
          {orderedLineups.map((lineup) => (
            <article
              key={lineup.id}
              className="glass-card rounded-[28px] p-4 sm:p-5"
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

                <div className="glass-control inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
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
