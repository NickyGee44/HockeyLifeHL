'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlayerPosition, LeadershipRole } from '@/lib/actions/roster';

interface SearchResult {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  seasonId: string;
  leagueId: string;
  onPlayerAdded: () => void;
}

export function AddPlayerModal({
  isOpen,
  onClose,
  teamId,
  seasonId,
  leagueId,
  onPlayerAdded,
}: AddPlayerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<SearchResult | null>(null);
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState<PlayerPosition>('Forward');
  const [leadershipRole, setLeadershipRole] = useState<LeadershipRole>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/leagues/${leagueId}/players/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch {
        // Silently fail search
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, leagueId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPlayer) {
      setError('Please search for and select a player');
      return;
    }

    const jerseyNum = parseInt(jerseyNumber);
    if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
      setError('Jersey number must be between 1 and 99');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/teams/${teamId}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          seasonId,
          jerseyNumber: jerseyNum,
          position,
          leadershipRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add player');
      }

      resetForm();
      onPlayerAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlayer(null);
    setJerseyNumber('');
    setPosition('Forward');
    setLeadershipRole(null);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Add Player to Roster</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Player
              </label>
              {selectedPlayer ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedPlayer.full_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlayer(null);
                      setSearchQuery('');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Search by name..."
                    disabled={loading}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5 text-gray-400 text-xs">Searching...</div>
                  )}
                  {searchResults.length > 0 && !selectedPlayer && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlayer(player);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-900"
                        >
                          {player.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-500">
                      No players found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Jersey Number */}
            <div>
              <label htmlFor="jerseyNumber" className="block text-sm font-medium text-gray-700">
                Jersey Number
              </label>
              <input
                type="number"
                id="jerseyNumber"
                min="1"
                max="99"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="1-99"
                disabled={loading}
                required
              />
            </div>

            {/* Position */}
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                Position
              </label>
              <select
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
                required
              >
                <option value="forward">Forward</option>
                <option value="defense">Defense</option>
                <option value="goalie">Goalie</option>
              </select>
            </div>

            {/* Leadership Role */}
            <div>
              <label htmlFor="leadershipRole" className="block text-sm font-medium text-gray-700">
                Leadership Role (Optional)
              </label>
              <select
                id="leadershipRole"
                value={leadershipRole || ''}
                onChange={(e) =>
                  setLeadershipRole(e.target.value ? (e.target.value as LeadershipRole) : null)
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">None</option>
                <option value="captain">Captain</option>
                <option value="alternate">Alternate Captain</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedPlayer}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Player'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
