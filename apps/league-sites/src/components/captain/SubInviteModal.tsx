'use client';

import { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserPlus,
  Loader2,
  Search,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  inviteSub,
  inviteRecentPlayerAsSub,
  addManualSub,
  getLeagueSubPlayers,
  getRecentSubPlayers,
  getTeamSubInvitations,
  type RecentSubPlayer,
} from '@/lib/actions/sub-invitations';
import type { RosterPlayer } from '@/lib/actions/captain-roster';
import {
  filterSubCandidatesByReplacementRole,
  getSubPositionRole,
  matchesSubCandidateSearch,
  type SubPositionRole,
} from '@/lib/captain/sub-role-filter';

interface SubInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  teamId: string;
  leagueId: string;
  roster: RosterPlayer[];
  gameDateLabel?: string;
  missingPlayers?: Array<{
    playerId: string;
    fullName: string;
    jerseyNumber: number | null;
    position: string | null;
  }>;
}

interface SubPlayer {
  id: string;
  full_name: string | null;
  email: string | null;
  source: 'team' | 'league';
  position: string | null;
}

type SubInviteViewMode = 'spares' | 'manual' | 'recent';

function getManualPositionOptions(replacementRole: SubPositionRole | null) {
  if (replacementRole === 'goalie') return ['Goalie'];
  if (replacementRole === 'skater') return ['Forward', 'Defense'];
  return ['Forward', 'Defense', 'Goalie'];
}

function defaultManualPositionForRole(replacementRole: SubPositionRole | null) {
  return replacementRole === 'goalie' ? 'Goalie' : '';
}

export function SubInviteModal({
  isOpen,
  onClose,
  gameId,
  teamId,
  leagueId,
  roster,
  gameDateLabel,
  missingPlayers = [],
}: SubInviteModalProps) {
  const [availableSubs, setAvailableSubs] = useState<SubPlayer[]>([]);
  const [recentPlayers, setRecentPlayers] = useState<RecentSubPlayer[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<SubInviteViewMode>('spares');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [replacedPlayerId, setReplacedPlayerId] = useState<string>('');
  const [manualName, setManualName] = useState('');
  const [manualPosition, setManualPosition] = useState('');
  const [manualJerseyNumber, setManualJerseyNumber] = useState('');
  const [saveManualToTeamSpares, setSaveManualToTeamSpares] = useState(false);
  const [manualAddedMessage, setManualAddedMessage] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [confirmedInvites, setConfirmedInvites] = useState<Set<string>>(new Set());
  const [captainConfirmed, setCaptainConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const selectedReplacementPlayer = missingPlayers.find(
    (player) => player.playerId === replacedPlayerId,
  );
  const selectedReplacementPosition = selectedReplacementPlayer?.position ?? null;
  const selectedReplacementRole = getSubPositionRole(selectedReplacementPosition);
  const manualPositionOptions = getManualPositionOptions(selectedReplacementRole);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mounted gates client-only portal rendering.
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSubs = async () => {
      setIsLoading(true);
      const [subsResult, invitesResult] = await Promise.all([
        getLeagueSubPlayers(leagueId, teamId),
        getTeamSubInvitations(teamId, [gameId]),
      ]);

      if (subsResult.success && subsResult.data) {
        // Also include own team's sub/part_time players
        const rosterPlayerIds = new Set(roster.map((r) => r.player_id));
        const allSubs = subsResult.data.filter(
          (s) => !rosterPlayerIds.has(s.id)
        );
        setAvailableSubs(allSubs);
      }

      if (invitesResult.success && invitesResult.data) {
        const invitedPlayerIds = invitesResult.data.map((invite) => invite.invited_player_id);
        const confirmedPlayerIds = invitesResult.data
          .filter((invite) => invite.status === 'accepted')
          .map((invite) => invite.invited_player_id);

        setSentInvites(new Set(invitedPlayerIds));
        setConfirmedInvites(new Set(confirmedPlayerIds));
      }

      setIsLoading(false);
    };

    fetchSubs();
    // Reset state when opening
    // eslint-disable-next-line react-hooks/set-state-in-effect -- modal form state intentionally resets when opened.
    setSearchQuery('');
    setViewMode('spares');
    setRecentPlayers([]);
    setIsRecentLoading(false);
    setRecentLoaded(false);
    setMessage('');
    const defaultReplacementPlayer = missingPlayers[0] ?? null;
    const defaultReplacementRole = getSubPositionRole(defaultReplacementPlayer?.position);
    setReplacedPlayerId(defaultReplacementPlayer?.playerId ?? '');
    setManualName('');
    setManualPosition(defaultManualPositionForRole(defaultReplacementRole));
    setManualJerseyNumber('');
    setSaveManualToTeamSpares(false);
    setManualAddedMessage(null);
    setSentInvites(new Set());
    setConfirmedInvites(new Set());
    setCaptainConfirmed(false);
    setError(null);
  }, [isOpen, leagueId, teamId, gameId, roster, missingPlayers]);

  const filteredSubs = filterSubCandidatesByReplacementRole(
    availableSubs,
    selectedReplacementPosition,
  ).filter((sub) => matchesSubCandidateSearch(sub, searchQuery));

  const filteredRecentPlayers = filterSubCandidatesByReplacementRole(
    recentPlayers,
    selectedReplacementPosition,
  ).filter((player) => matchesSubCandidateSearch(player, searchQuery));

  const formatLastPlayed = (value: string | null) => {
    if (!value) return 'Recent game';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recent game';
    return `Last played ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  };

  const handleReplacementChange = (nextPlayerId: string) => {
    const nextPlayer = missingPlayers.find((player) => player.playerId === nextPlayerId);
    const nextRole = getSubPositionRole(nextPlayer?.position);

    setReplacedPlayerId(nextPlayerId);
    setRecentPlayers([]);
    setRecentLoaded(false);
    setSearchQuery('');
    setManualPosition((current) => {
      if (nextRole === 'goalie') return 'Goalie';
      if (nextRole === 'skater' && getSubPositionRole(current) === 'goalie') return '';
      return current || defaultManualPositionForRole(nextRole);
    });

    if (!nextPlayerId) {
      setCaptainConfirmed(false);
    }

    if (viewMode === 'recent') {
      void loadRecentPlayersForRole(nextRole);
    }
  };

  const loadRecentPlayersForRole = async (replacementRole: SubPositionRole | null) => {
    if (isRecentLoading) {
      return;
    }

    setIsRecentLoading(true);
    setError(null);
    const result = await getRecentSubPlayers(gameId, teamId, replacementRole);
    if (result.success && result.data) {
      setRecentPlayers(result.data);
      setRecentLoaded(true);
    } else {
      setError(result.error || 'Failed to load recent players');
    }
    setIsRecentLoading(false);
  };

  const loadRecentPlayers = async () => {
    if (recentLoaded || isRecentLoading) {
      return;
    }

    await loadRecentPlayersForRole(selectedReplacementRole);
  };

  const saveInvite = (playerId: string, markConfirmed: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await inviteSub(
        gameId,
        teamId,
        playerId,
        message || undefined,
        replacedPlayerId || null,
        markConfirmed,
      );
      if (result.success) {
        setSentInvites((prev) => new Set([...prev, playerId]));
        if (markConfirmed) {
          setConfirmedInvites((prev) => new Set([...prev, playerId]));
        }
      } else {
        setError(result.error || 'Failed to send invitation');
      }
    });
  };

  const saveRecentInvite = (playerId: string, markConfirmed: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await inviteRecentPlayerAsSub(
        gameId,
        teamId,
        playerId,
        message || undefined,
        replacedPlayerId || null,
        markConfirmed,
      );
      if (result.success) {
        setSentInvites((prev) => new Set([...prev, playerId]));
        if (markConfirmed) {
          setConfirmedInvites((prev) => new Set([...prev, playerId]));
        }
      } else {
        setError(result.error || 'Failed to send one-game invite');
      }
    });
  };

  const handleInvite = (playerId: string) => {
    saveInvite(playerId, Boolean(captainConfirmed));
  };

  const handleMarkIn = (playerId: string) => {
    saveInvite(playerId, true);
  };

  const handleRecentInvite = (playerId: string) => {
    saveRecentInvite(playerId, Boolean(captainConfirmed));
  };

  const handleRecentMarkIn = (playerId: string) => {
    saveRecentInvite(playerId, true);
  };

  const showRecentPlayers = () => {
    setViewMode('recent');
    setSearchQuery('');
    void loadRecentPlayers();
  };

  const showManualSubForm = () => {
    setViewMode('manual');
    setSearchQuery('');
  };

  const showAvailableSpares = () => {
    setViewMode('spares');
    setSearchQuery('');
  };

  const handleAddManualSub = () => {
    const name = manualName.trim();
    if (!name) {
      setError('Enter the spare player name.');
      return;
    }

    const jerseyNumber = manualJerseyNumber.trim()
      ? Number.parseInt(manualJerseyNumber.trim(), 10)
      : null;

    if (jerseyNumber !== null && (!Number.isInteger(jerseyNumber) || jerseyNumber <= 0 || jerseyNumber >= 1000)) {
      setError('Enter a valid jersey number.');
      return;
    }

    setError(null);
    setManualAddedMessage(null);
    startTransition(async () => {
      const result = await addManualSub({
        gameId,
        teamId,
        fullName: name,
        position: manualPosition || null,
        jerseyNumber,
        message: message || undefined,
        replacedPlayerId: replacedPlayerId || null,
        saveToTeamSpares: saveManualToTeamSpares,
      });

      if (!result.success || !result.playerId) {
        setError(result.error || 'Failed to add manual spare');
        return;
      }

      setSentInvites((prev) => new Set([...prev, result.playerId!]));
      setConfirmedInvites((prev) => new Set([...prev, result.playerId!]));
      setManualAddedMessage(`${result.fullName || name} added and marked in.`);
      setManualName('');
      setManualPosition('');
      setManualJerseyNumber('');
    });
  };

  if (!isOpen || !mounted) return null;

  const modal = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="glass-card-strong relative mx-4 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[var(--league-primary)]" />
              Find Spare
            </h2>
            {gameDateLabel && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                {gameDateLabel}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Replacement target + optional message */}
        <div className="px-4 pt-3">
          {missingPlayers.length > 0 ? (
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Replacing
              <select
                value={replacedPlayerId}
                onChange={(event) => handleReplacementChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
              >
                <option value="">No specific player</option>
                {missingPlayers.map((player) => (
                  <option key={player.playerId} value={player.playerId}>
                    {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.fullName}{player.position ? ` (${player.position})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mb-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              Tip: mark the missing player Out first so the spare is tied to the right replacement.
            </p>
          )}
          {replacedPlayerId && (
            <label className="mb-2 flex cursor-pointer gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={captainConfirmed}
                onChange={(event) => setCaptainConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-surface-hover)] accent-[var(--league-primary)]"
              />
              <span>
                <span className="block font-semibold">Sub already confirmed in</span>
                <span className="block text-xs text-[var(--color-text-secondary)]">
                  Use this when you already called or texted the sub. They will show as In immediately.
                </span>
              </span>
            </label>
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional message to the player..."
            className="w-full px-3 py-2 text-sm bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)] resize-none"
            rows={2}
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={showManualSubForm}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                viewMode === 'manual'
                  ? 'border-green-400/40 bg-green-500/15 text-green-300'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:border-green-400/30 hover:text-green-300'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Add New Sub
            </button>
            <button
              type="button"
              onClick={showRecentPlayers}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                viewMode === 'recent'
                  ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:border-cyan-400/30 hover:text-cyan-300'
              }`}
            >
              <Search className="h-4 w-4" />
              Select Recent Player
            </button>
          </div>

          {viewMode !== 'spares' && (
            <button
              type="button"
              onClick={showAvailableSpares}
              className="mt-2 text-xs font-semibold text-[var(--league-primary)] hover:underline"
            >
              Back to available spares
            </button>
          )}

          {viewMode === 'manual' && (
            <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Add new sub
                </p>
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-green-300">
                  One game
                </span>
              </div>
              <div className="grid gap-2">
                <input
                  type="text"
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder="Player name"
                  className="glass-control w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
                />
                <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                  <select
                    value={manualPosition}
                    onChange={(event) => setManualPosition(event.target.value)}
                    className="glass-control min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
                  >
                    <option value="">Position</option>
                    {manualPositionOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    value={manualJerseyNumber}
                    onChange={(event) => setManualJerseyNumber(event.target.value)}
                    placeholder="#"
                    className="glass-control w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={saveManualToTeamSpares}
                    onChange={(event) => setSaveManualToTeamSpares(event.target.checked)}
                    className="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-surface)] accent-[var(--league-primary)]"
                  />
                  Save to team spares
                </label>
                <button
                  type="button"
                  onClick={handleAddManualSub}
                  disabled={isPending || !manualName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-300 transition-colors hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add + Mark In
                </button>
              </div>
              {manualAddedMessage && (
                <p className="mt-2 text-xs font-medium text-green-300">
                  {manualAddedMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        {viewMode !== 'manual' && (
          <div className="px-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={viewMode === 'recent' ? 'Search recent players...' : 'Search by name or email...'}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Player list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {viewMode === 'manual' ? (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-4 text-center text-sm text-[var(--color-text-secondary)]">
              Enter the new sub above. They will be added as a one-game spare and marked In for this game.
            </div>
          ) : viewMode === 'recent' ? (
            isRecentLoading ? (
              <div className="flex items-center justify-center py-8 text-[var(--color-text-secondary)]">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading recent players...
              </div>
            ) : filteredRecentPlayers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {searchQuery
                    ? 'No matching recent players found'
                    : 'No recent non-rostered players found'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Recent means played in this league in the current or previous season, while not rostered this season.
                </p>
              </div>
            ) : (
              filteredRecentPlayers.map((player) => {
                const alreadyInvited = sentInvites.has(player.id);
                const confirmedIn = confirmedInvites.has(player.id);

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-hover)]/80"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-[var(--color-text-primary)]">
                          {player.full_name || 'Unknown Player'}
                        </p>
                        <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
                          Recent
                        </span>
                      </div>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {[player.position, player.email, formatLastPlayed(player.last_played_at)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>

                    {alreadyInvited ? (
                      confirmedIn ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">
                          <Check className="w-3 h-3" />
                          Confirmed In
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRecentMarkIn(player.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        >
                          {isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Mark In
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleRecentInvite(player.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--league-primary)]/10 text-[var(--league-primary)] rounded-lg text-xs font-medium hover:bg-[var(--league-primary)]/20 transition-colors disabled:opacity-50"
                      >
                        {isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserPlus className="w-3 h-3" />
                        )}
                        {captainConfirmed ? 'Invite + Mark In' : 'Invite'}
                      </button>
                    )}
                  </div>
                );
              })
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8 text-[var(--color-text-secondary)]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading available subs...
            </div>
          ) : filteredSubs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {searchQuery
                  ? 'No matching players found'
                  : 'No sub players available in this league'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Players need to be registered as subs or part-time players
              </p>
            </div>
          ) : (
            filteredSubs.map((sub) => {
              const alreadyInvited = sentInvites.has(sub.id);
              const confirmedIn = confirmedInvites.has(sub.id);

              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-hover)]/80"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-[var(--color-text-primary)]">
                        {sub.full_name || 'Unknown Player'}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        sub.source === 'team'
                          ? 'bg-cyan-500/10 text-cyan-300'
                          : 'bg-emerald-500/10 text-emerald-300'
                      }`}>
                        {sub.source === 'team' ? 'Team' : 'League'}
                      </span>
                    </div>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      {[sub.position, sub.email].filter(Boolean).join(' · ') || 'Active spare'}
                    </p>
                  </div>

                  {alreadyInvited ? (
                    confirmedIn ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">
                        <Check className="w-3 h-3" />
                        Confirmed In
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkIn(sub.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                      >
                        {isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Mark In
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleInvite(sub.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--league-primary)]/10 text-[var(--league-primary)] rounded-lg text-xs font-medium hover:bg-[var(--league-primary)]/20 transition-colors disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      {captainConfirmed ? 'Invite + Mark In' : 'Invite'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-lg font-medium hover:bg-[var(--color-surface-hover)]/80 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
