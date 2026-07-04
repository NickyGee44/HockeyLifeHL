import Link from 'next/link';
import type { GameData, ScorekeeperSession } from '@/lib/actions/scorekeeper';

interface CaptainFlowStatusPanelProps {
  game: GameData;
  session: ScorekeeperSession;
  leagueSlug: string;
}

/**
 * Shown on the scoring surface when a captain returns to a game that is already
 * submitted (pending_verification) or completed. Without this they'd land back
 * on the live-scoring controls, which is confusing for a game that's already
 * been scored. Gives closure and the right next action.
 */
export function CaptainFlowStatusPanel({ game, session, leagueSlug }: CaptainFlowStatusPanelProps) {
  const homeName = game.homeTeam.shortName || game.homeTeam.name;
  const awayName = game.awayTeam.shortName || game.awayTeam.name;
  const isCompleted = game.status === 'completed';

  // In pending_verification exactly one side (the initiator) is auto-verified.
  const opponentType = session.initiatingTeamType === 'home' ? 'away' : 'home';
  const opponentName = opponentType === 'home' ? homeName : awayName;

  const ScoreLine = (
    <div className="flex items-center justify-center gap-4 py-2">
      <div className="text-right">
        <div className="text-sm font-semibold text-[var(--color-text-secondary)]">{homeName}</div>
      </div>
      <div className="flex items-center gap-2 text-3xl font-black tabular-nums text-[var(--color-text-primary)]">
        <span>{game.homeScore}</span>
        <span className="text-[var(--color-text-secondary)]">–</span>
        <span>{game.awayScore}</span>
      </div>
      <div className="text-left">
        <div className="text-sm font-semibold text-[var(--color-text-secondary)]">{awayName}</div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
        <div
          className={[
            'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full',
            isCompleted ? 'bg-green-500/15 text-green-400' : 'bg-cyan-500/15 text-cyan-400',
          ].join(' ')}
        >
          {isCompleted ? (
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <h1 className="text-xl font-black text-[var(--color-text-primary)]">
          {isCompleted ? 'Game complete' : 'Submitted for verification'}
        </h1>

        {ScoreLine}

        {isCompleted ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Final stats are locked in and standings have been updated. A recap article is generated
            automatically.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Your score is in. The <span className="font-semibold text-[var(--color-text-primary)]">{opponentName}</span> captain
            has 24 hours to confirm it. If they don&apos;t, the game finalizes automatically — you
            don&apos;t need to do anything else.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {isCompleted && (
            <Link
              href={`/${leagueSlug}/news`}
              className="w-full rounded-xl bg-[var(--league-primary,#d4af37)] py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              View recap
            </Link>
          )}
          <Link
            href={`/${leagueSlug}/games/${game.id}`}
            className="w-full rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-background)]"
          >
            View game
          </Link>
          <Link
            href={`/${leagueSlug}/captain`}
            className="w-full rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-background)]"
          >
            Back to Game Day
          </Link>
        </div>
      </div>
    </div>
  );
}
