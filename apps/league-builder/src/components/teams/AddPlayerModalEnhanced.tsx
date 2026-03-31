'use client';

import { useState, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import { sendTeamInvite } from '@/lib/actions/team-invites';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Search,
  UserPlus,
  Mail,
  Loader2,
  AlertCircle,
  Check } from 'lucide-react';

interface AddPlayerModalEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  leagueId: string;
  seasonId?: string;
  onSuccess?: () => void;
}

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  latest_team_name?: string | null;
  latest_season_name?: string | null;
  source?: 'roster' | 'registration';
}

const POSITIONS = [
  { value: 'Forward', label: 'Forward' },
  { value: 'Defense', label: 'Defense' },
  { value: 'Goalie', label: 'Goalie' },
];

export function AddPlayerModalEnhanced({
  isOpen,
  onClose,
  teamId,
  leagueId,
  seasonId,
  onSuccess }: AddPlayerModalEnhancedProps) {
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Details form state
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('Forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep('search');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedPlayer(null);
      setJerseyNumber('');
      setPosition('Forward');
      setError(null);
      setSuccessMessage(null);
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteMessage('');
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchPlayers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchPlayers depends on leagueId which is a stable prop; including it would defeat the debounce pattern
  }, [searchQuery]);

  const searchPlayers = async (query: string) => {
    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        teamId,
      });

      if (seasonId) {
        params.set('seasonId', seasonId);
      }

      const response = await fetch(
        `/api/leagues/${leagueId}/players/search?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to search players');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search players');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setStep('details');
    setError(null);
    setSuccessMessage(null);
  };

  const handleInvitePlayer = async () => {
    if (!seasonId) {
      setError('Create or activate a season before sending team invites.');
      return;
    }

    if (!inviteEmail.trim()) {
      setError('Enter an email address to send the invite.');
      return;
    }

    setIsInviting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await sendTeamInvite(
        teamId,
        seasonId,
        inviteEmail.trim(),
        inviteMessage.trim() || undefined
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccessMessage(
        result.alreadyHasAccount
          ? 'Player already had an account and was added to the roster.'
          : 'Invite email sent successfully.'
      );

      setInviteEmail('');
      setInviteMessage('');

      if (result.alreadyHasAccount) {
        onSuccess?.();
        onClose();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!selectedPlayer || !jerseyNumber) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        playerId: selectedPlayer.id,
        jerseyNumber: parseInt(jerseyNumber),
        position,
        seasonId: seasonId || undefined };

      const response = await fetch(`/api/teams/${teamId}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add player');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep('search');
    setSelectedPlayer(null);
    setJerseyNumber('');
    setError(null);
  };

  const getPlayerContextLabel = (player: Player) => {
    if (player.latest_team_name && player.latest_season_name) {
      return `${player.latest_team_name} • ${player.latest_season_name}`;
    }

    if (player.latest_season_name) {
      return player.source === 'registration'
        ? `Registered in ${player.latest_season_name}`
        : player.latest_season_name;
    }

    if (player.latest_team_name) {
      return player.latest_team_name;
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-neutral-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {step === 'search' ? 'Add Player to Roster' : 'Player Details'}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {step === 'search'
              ? 'Search league players from this season or previous seasons, or invite a new one'
              : `Add ${selectedPlayer?.full_name} to the team roster`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-400">{successMessage}</p>
          </div>
        )}

        {step === 'search' ? (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                type="text"
                placeholder="Search by player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-rink-500 animate-spin" />
                  <span className="ml-2 text-neutral-400">Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPlayer(player)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                      'bg-neutral-800/50 hover:bg-neutral-800 border border-transparent',
                      'hover:border-rink-500/30'
                    )}
                  >
                    <img
                      src={player.avatar_url || '/blank_player.png'}
                      alt={player.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{player.full_name}</p>
                      {getPlayerContextLabel(player) && (
                        <p className="text-sm text-neutral-500">{getPlayerContextLabel(player)}</p>
                      )}
                    </div>
                    <UserPlus className="w-4 h-4 text-neutral-400" />
                  </button>
                ))
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-400">No players found</p>
                  <p className="text-sm text-neutral-500 mt-1">
                    Try a different name or invite the player by email below
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-400">Start typing to search</p>
                  <p className="text-sm text-neutral-500 mt-1">
                    Search players from this league, including previous seasons
                  </p>
                </div>
              )}
            </div>

            {/* Invite New Player Option */}
            <div className="pt-4 border-t border-neutral-800">
              <button
                onClick={() => {
                  setShowInviteForm((value) => !value);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                  'border-2 border-dashed border-neutral-700 hover:border-rink-500/50',
                  'text-neutral-400 hover:text-white'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Invite New Player</p>
                  <p className="text-sm text-neutral-500">
                    Send an invitation by email
                  </p>
                </div>
              </button>

              {showInviteForm && (
                <div className="mt-3 space-y-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-300">
                      Player Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="player@example.com"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-300">
                      Message
                    </label>
                    <textarea
                      value={inviteMessage}
                      onChange={(event) => setInviteMessage(event.target.value)}
                      rows={3}
                      placeholder="Optional message for the player"
                      className={cn(
                        'w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2',
                        'text-sm text-white placeholder:text-neutral-500',
                        'focus:border-rink-500 focus:outline-none focus:ring-2 focus:ring-rink-500/20'
                      )}
                    />
                  </div>

                  {!seasonId && (
                    <p className="text-xs text-yellow-400">
                      A current season is required before you can invite a player to join this roster.
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteForm(false);
                        setInviteEmail('');
                        setInviteMessage('');
                        setError(null);
                      }}
                      className="px-3 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleInvitePlayer}
                      disabled={isInviting || !inviteEmail.trim() || !seasonId}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                        'bg-rink-500 text-black hover:bg-rink-400 disabled:cursor-not-allowed disabled:opacity-50'
                      )}
                    >
                      {isInviting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Send Invite
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Player Info */}
            {selectedPlayer && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-rink-500/10 border border-white/10">
                <img
                  src={selectedPlayer.avatar_url || '/blank_player.png'}
                  alt={selectedPlayer.full_name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-rink-500"
                />
                <div>
                  <p className="font-medium text-white">{selectedPlayer.full_name}</p>
                  <p className="text-sm text-rink-500">Selected for roster</p>
                </div>
              </div>
            )}

            {/* Jersey Number */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Jersey Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={99}
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="1-99"
                required
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Position <span className="text-red-500">*</span>
              </label>
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
          </div>
        )}

        <DialogFooter className="gap-3">
          {step === 'details' && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          {step === 'details' && (
            <button
              onClick={handleAddPlayer}
              disabled={isSubmitting || !jerseyNumber}
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
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add to Roster
                </>
              )}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddPlayerModalEnhanced;
