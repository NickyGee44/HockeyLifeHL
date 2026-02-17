'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ScorekeeperDashboardData, DashboardGame, SwapRequestData } from '@/lib/actions/scorekeeper-dashboard';
import { SwapRequestModal } from './SwapRequestModal';
import { acceptSwap, declineSwap } from '@/lib/actions/scorekeeper-swaps';

// Hydration-safe date formatting — renders placeholder on server, locale string on client
function useFormattedDate(isoString: string, options: Intl.DateTimeFormatOptions): string {
  const [formatted, setFormatted] = useState('');
  useEffect(() => {
    setFormatted(new Date(isoString).toLocaleDateString('en-US', options));
  }, [isoString]);
  return formatted;
}

function useFormattedTime(isoString: string, options: Intl.DateTimeFormatOptions): string {
  const [formatted, setFormatted] = useState('');
  useEffect(() => {
    setFormatted(new Date(isoString).toLocaleTimeString('en-US', options));
  }, [isoString]);
  return formatted;
}

function FormattedDateTime({ iso, className }: { iso: string; className?: string }) {
  const date = useFormattedDate(iso, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = useFormattedTime(iso, { hour: 'numeric', minute: '2-digit' });
  return <span className={className}>{date} {time}</span>;
}

interface ScorekeeperDashboardViewProps {
  data: ScorekeeperDashboardData;
  leagueSlug: string;
}

export function ScorekeeperDashboardView({ data, leagueSlug }: ScorekeeperDashboardViewProps) {
  const [swapModalGameId, setSwapModalGameId] = useState<string | null>(null);
  const [pendingSwaps] = useState(data.pendingSwapRequests);
  const [incomingSwaps, setIncomingSwaps] = useState(data.incomingSwapRequests);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const upcomingCount = data.upcomingGames.length;
  const completedCount = data.scorekeeper.completedAssignments;
  const totalCount = data.scorekeeper.totalAssignments;

  async function handleAcceptSwap(swapId: string) {
    setActionLoading(swapId);
    const result = await acceptSwap(swapId);
    if (result.success) {
      setIncomingSwaps(prev => prev.filter(s => s.id !== swapId));
    }
    setActionLoading(null);
  }

  async function handleDeclineSwap(swapId: string) {
    setActionLoading(swapId);
    const result = await declineSwap(swapId);
    if (result.success) {
      setIncomingSwaps(prev => prev.filter(s => s.id !== swapId));
    }
    setActionLoading(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {data.scorekeeper.displayName}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {data.scorekeeper.leagueName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard value={upcomingCount} label="Upcoming" color="blue" />
        <StatCard value={completedCount} label="Completed" color="green" />
        <StatCard value={totalCount} label="Total" color="gold" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href={`/${leagueSlug}/scorekeeper`}
          className="flex items-center gap-3 p-4 bg-[var(--league-primary,#d4af37)]/10 border border-[var(--league-primary,#d4af37)]/20 rounded-xl hover:bg-[var(--league-primary,#d4af37)]/20 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--league-primary,#d4af37)]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--league-primary,#d4af37)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[var(--league-primary,#d4af37)]">Score a Game</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Start scoring</p>
          </div>
        </Link>

        <Link
          href={`/${leagueSlug}/scorekeeper/schedule`}
          className="flex items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">My Schedule</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Weekly view</p>
          </div>
        </Link>
      </div>

      {/* Incoming Swap Requests */}
      {incomingSwaps.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Swap Requests to Cover
          </h2>
          <div className="space-y-3">
            {incomingSwaps.map((swap) => (
              <SwapRequestCard
                key={swap.id}
                swap={swap}
                type="incoming"
                loading={actionLoading === swap.id}
                onAccept={() => handleAcceptSwap(swap.id)}
                onDecline={() => handleDeclineSwap(swap.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pending Swap Requests (outgoing) */}
      {pendingSwaps.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
            My Swap Requests
          </h2>
          <div className="space-y-3">
            {pendingSwaps.map((swap) => (
              <SwapRequestCard
                key={swap.id}
                swap={swap}
                type="outgoing"
                loading={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Games */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
          Upcoming Games ({upcomingCount})
        </h2>
        {upcomingCount === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-center">
            <p className="text-[var(--color-text-secondary)]">No upcoming assignments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.upcomingGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                leagueSlug={leagueSlug}
                showSwapButton
                onRequestSwap={() => setSwapModalGameId(game.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Completed Games */}
      {data.completedGames.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
            Recent Games
          </h2>
          <div className="space-y-3">
            {data.completedGames.map((game) => (
              <GameCard key={game.id} game={game} leagueSlug={leagueSlug} />
            ))}
          </div>
        </section>
      )}

      {/* Swap Request Modal */}
      {swapModalGameId && (
        <SwapRequestModal
          isOpen={!!swapModalGameId}
          onClose={() => setSwapModalGameId(null)}
          gameId={swapModalGameId}
          game={data.upcomingGames.find(g => g.id === swapModalGameId) || null}
        />
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function StatCard({ value, label, color }: { value: number; label: string; color: 'blue' | 'green' | 'gold' }) {
  const colorMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    gold: 'text-[var(--league-primary,#d4af37)]',
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}

function GameCard({
  game,
  leagueSlug,
  showSwapButton,
  onRequestSwap,
}: {
  game: DashboardGame;
  leagueSlug: string;
  showSwapButton?: boolean;
  onRequestSwap?: () => void;
}) {
  const isLive = game.status === 'in_progress';
  const isCompleted = game.status === 'completed' || game.status === 'final';

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center px-2 py-0.5 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full">
              FINAL
            </span>
          )}
          <FormattedDateTime iso={game.scheduledAt} className="text-xs text-[var(--color-text-secondary)]" />
        </div>
        {game.venueName && (
          <span className="text-xs text-[var(--color-text-secondary)]">{game.venueName}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[var(--color-text-primary)]">{game.homeTeamName}</span>
            {isCompleted && <span className="text-lg font-bold text-[var(--color-text-primary)]">{game.homeScore}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-semibold text-[var(--color-text-primary)]">{game.awayTeamName}</span>
            {isCompleted && <span className="text-lg font-bold text-[var(--color-text-primary)]">{game.awayScore}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showSwapButton && !isCompleted && (
            <button
              onClick={onRequestSwap}
              className="px-3 py-1.5 text-xs font-medium text-amber-400 border border-amber-400/30 rounded-lg hover:bg-amber-400/10 transition-colors"
            >
              Request Swap
            </button>
          )}
          {(isLive || game.status === 'scheduled') && (
            <Link
              href={`/${leagueSlug}/scorekeeper/game/${game.id}`}
              className="px-3 py-1.5 text-xs font-medium text-[var(--color-accent-text,#000)] bg-[var(--league-primary,#d4af37)] rounded-lg hover:opacity-90 transition-opacity"
            >
              {isLive ? 'Continue' : 'Score'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function SwapRequestCard({
  swap,
  type,
  loading,
  onAccept,
  onDecline,
}: {
  swap: SwapRequestData;
  type: 'incoming' | 'outgoing';
  loading: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-amber-400/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <FormattedDateTime iso={swap.game.scheduledAt} className="text-xs text-[var(--color-text-secondary)]" />
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-400/10 text-amber-400 rounded-full">
          Pending
        </span>
      </div>

      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
        {swap.game.homeTeamName} vs {swap.game.awayTeamName}
      </p>

      {type === 'incoming' && (
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">
          Requested by {swap.requestingScorekeeper.displayName}
          {swap.reason && ` - "${swap.reason}"`}
        </p>
      )}

      {type === 'outgoing' && swap.reason && (
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">
          Reason: {swap.reason}
        </p>
      )}

      {type === 'incoming' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAccept}
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs font-medium text-[var(--color-accent-text,#000)] bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Accept'}
          </button>
          <button
            onClick={onDecline}
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {type === 'outgoing' && (
        <p className="text-xs text-amber-400 mt-2">
          Waiting for another scorekeeper to accept...
        </p>
      )}
    </div>
  );
}
