'use client';

import { useState, useEffect, useTransition } from 'react';
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
  getLeagueSubPlayers,
} from '@/lib/actions/sub-invitations';
import type { RosterPlayer } from '@/lib/actions/captain-roster';

interface SubInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  teamId: string;
  leagueId: string;
  roster: RosterPlayer[];
  gameDateLabel?: string;
}

interface SubPlayer {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function SubInviteModal({
  isOpen,
  onClose,
  gameId,
  teamId,
  leagueId,
  roster,
  gameDateLabel,
}: SubInviteModalProps) {
  const [availableSubs, setAvailableSubs] = useState<SubPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSubs = async () => {
      setIsLoading(true);
      const result = await getLeagueSubPlayers(leagueId, teamId);
      if (result.success && result.data) {
        // Also include own team's sub/part_time players
        const rosterPlayerIds = new Set(roster.map((r) => r.player_id));
        const allSubs = result.data.filter(
          (s) => !rosterPlayerIds.has(s.id)
        );
        setAvailableSubs(allSubs);
      }
      setIsLoading(false);
    };

    fetchSubs();
    // Reset state when opening
    setSearchQuery('');
    setMessage('');
    setSentInvites(new Set());
    setError(null);
  }, [isOpen, leagueId, teamId, roster]);

  const filteredSubs = availableSubs.filter((sub) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (sub.full_name?.toLowerCase().includes(q)) ||
      (sub.email?.toLowerCase().includes(q))
    );
  });

  const handleInvite = (playerId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await inviteSub(gameId, teamId, playerId, message || undefined);
      if (result.success) {
        setSentInvites((prev) => new Set([...prev, playerId]));
      } else {
        setError(result.error || 'Failed to send invitation');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[var(--league-primary)]" />
              Invite Sub
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

        {/* Optional message */}
        <div className="px-4 pt-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional message to the player..."
            className="w-full px-3 py-2 text-sm bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)] resize-none"
            rows={2}
          />
        </div>

        {/* Search */}
        <div className="px-4 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Player list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
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

              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-hover)]/80"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">
                      {sub.full_name || 'Unknown Player'}
                    </p>
                    {sub.email && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {sub.email}
                      </p>
                    )}
                  </div>

                  {alreadyInvited ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">
                      <Check className="w-3 h-3" />
                      Invited
                    </span>
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
                      Invite
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
}
