'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import {
  Crown,
  Shield,
  MoreVertical,
  Edit,
  UserMinus,
  Loader2,
  AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface RosterPlayer {
  id: string;
  player_id: string;
  jersey_number: number;
  position: string;
  status: string;
  leadership_role: string | null;
  start_date: string;
  player: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
  rating_grade?: string | null;
  rating_percentile?: number | null;
}

interface RosterTableProps {
  teamId: string;
  seasonId?: string;
}

const POSITIONS = [
  { value: 'Forward', label: 'Forward', abbrev: 'F' },
  { value: 'Defense', label: 'Defense', abbrev: 'D' },
  { value: 'Goalie', label: 'Goalie', abbrev: 'G' },
];

const STATUSES = [
  { value: 'active', label: 'Active', color: 'text-green-500 bg-green-500/10' },
  { value: 'injured', label: 'Injured', color: 'text-red-500 bg-red-500/10' },
  { value: 'suspended', label: 'Suspended', color: 'text-orange-500 bg-orange-500/10' },
  { value: 'inactive', label: 'Inactive', color: 'text-neutral-500 bg-neutral-500/10' },
];

export function RosterTable({ teamId, seasonId }: RosterTableProps) {
  const router = useRouter();
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(null);
  const [removingPlayer, setRemovingPlayer] = useState<RosterPlayer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchRoster is a data-fetching function that depends on teamId and seasonId; also called after player edits
  }, [teamId, seasonId]);

  // Close action menu on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setActionMenuOpen(null);
    }
  }, []);

  useEffect(() => {
    if (actionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [actionMenuOpen, handleClickOutside]);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = seasonId
        ? `/api/teams/${teamId}/roster?seasonId=${seasonId}`
        : `/api/teams/${teamId}/roster`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch roster');
      }

      const data = await response.json();
      setRoster(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlayer = async () => {
    if (!removingPlayer) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/roster/${removingPlayer.id}`, {
        method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove player');
      }

      await fetchRoster();
      setRemovingPlayer(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove player');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePlayer = async (updates: Partial<RosterPlayer>) => {
    if (!editingPlayer) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/roster/${editingPlayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates) });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update player');
      }

      await fetchRoster();
      setEditingPlayer(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update player');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort roster: Goalies first, then Defense, then Forwards, then by jersey number
  const sortedRoster = [...roster].sort((a, b) => {
    const positionOrder: Record<string, number> = { Goalie: 0, Defense: 1, Forward: 2 };
    const posA = positionOrder[a.position] ?? 3;
    const posB = positionOrder[b.position] ?? 3;

    if (posA !== posB) return posA - posB;
    return a.jersey_number - b.jersey_number;
  });

  // Group by position
  const groupedRoster = {
    Goalie: sortedRoster.filter((p) => p.position === 'Goalie'),
    Defense: sortedRoster.filter((p) => p.position === 'Defense'),
    Forward: sortedRoster.filter((p) => p.position === 'Forward') };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-rink-500 animate-spin" />
        <span className="ml-2 text-neutral-400">Loading roster...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchRoster}
            className="text-sm text-red-500 hover:text-red-400 underline mt-1"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-xl bg-neutral-800/50 border border-neutral-700">
        <p className="text-neutral-400">No players on roster yet.</p>
        <p className="text-sm text-neutral-500 mt-1">Add players to build your team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Roster by Position */}
      {Object.entries(groupedRoster).map(([position, players]) => {
        if (players.length === 0) return null;

        return (
          <div key={position}>
            <h3 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
              {position}s ({players.length})
            </h3>
            <div className="bg-neutral-800/50 rounded-xl overflow-hidden border border-neutral-700 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-16">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-24">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-24">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-700/50">
                  {players.map((player) => (
                    <tr key={player.id} className="hover:bg-neutral-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xl font-bold text-white">
                            {player.jersey_number}
                          </span>
                          {player.leadership_role === 'captain' && (
                            <Crown className="w-4 h-4 text-rink-500" aria-label="Captain" />
                          )}
                          {player.leadership_role === 'alternate_captain' && (
                            <Shield className="w-4 h-4 text-silver-500" aria-label="Alternate Captain" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={player.player.avatar_url || '/blank_player.png'}
                            alt={player.player.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <p className="font-medium text-white">{player.player.full_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-semibold rounded-full',
                            STATUSES.find((s) => s.value === player.status)?.color ||
                              'text-neutral-500 bg-neutral-500/10'
                          )}
                        >
                          {player.status.charAt(0).toUpperCase() + player.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {player.rating_grade ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-rink-500/20 text-rink-400">
                            {player.rating_grade}
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block" ref={actionMenuOpen === player.id ? menuRef : undefined}>
                          <button
                            onClick={() =>
                              setActionMenuOpen(actionMenuOpen === player.id ? null : player.id)
                            }
                            className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {actionMenuOpen === player.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl z-10 overflow-hidden">
                              <button
                                onClick={() => {
                                  setEditingPlayer(player);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                                Edit Player
                              </button>
                              <button
                                onClick={() => {
                                  setRemovingPlayer(player);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <UserMinus className="w-4 h-4" />
                                Remove from Roster
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="bg-neutral-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Player</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Update {editingPlayer?.player.full_name}&apos;s roster information
            </DialogDescription>
          </DialogHeader>

          {editingPlayer && (
            <EditPlayerForm
              player={editingPlayer}
              onSubmit={handleUpdatePlayer}
              onCancel={() => setEditingPlayer(null)}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Player Confirmation */}
      <Dialog open={!!removingPlayer} onOpenChange={() => setRemovingPlayer(null)}>
        <DialogContent className="bg-neutral-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Player</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Are you sure you want to remove {removingPlayer?.player.full_name} from the roster?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-3">
            <button
              onClick={() => setRemovingPlayer(null)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRemovePlayer}
              disabled={isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
                'bg-red-500 text-white hover:bg-red-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Player'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Player Form Component
function EditPlayerForm({
  player,
  onSubmit,
  onCancel,
  isSubmitting }: {
  player: RosterPlayer;
  onSubmit: (updates: Partial<RosterPlayer>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [jerseyNumber, setJerseyNumber] = useState(player.jersey_number.toString());
  const [position, setPosition] = useState(player.position);
  const [status, setStatus] = useState(player.status);
  const [leadershipRole, setLeadershipRole] = useState(player.leadership_role || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      jersey_number: parseInt(jerseyNumber),
      position,
      status,
      leadership_role: leadershipRole || null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Jersey Number
        </label>
        <Input
          type="number"
          min={1}
          max={99}
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">Position</label>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className={cn(
            'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
            'text-sm text-white focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20'
          )}
        >
          {POSITIONS.map((pos) => (
            <option key={pos.value} value={pos.value}>
              {pos.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={cn(
            'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
            'text-sm text-white focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20'
          )}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Leadership Role
        </label>
        <select
          value={leadershipRole}
          onChange={(e) => setLeadershipRole(e.target.value)}
          className={cn(
            'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
            'text-sm text-white focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20'
          )}
        >
          <option value="">None</option>
          <option value="captain">Captain (C)</option>
          <option value="alternate_captain">Alternate Captain (A)</option>
        </select>
      </div>

      <DialogFooter className="gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
            'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
            'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </DialogFooter>
    </form>
  );
}

export default RosterTable;
