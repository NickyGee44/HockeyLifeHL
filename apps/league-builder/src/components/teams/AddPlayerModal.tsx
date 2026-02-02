'use client';

import { useState } from 'react';
import { PlayerPosition, LeadershipRole } from '@/lib/actions/roster';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  seasonId: string;
  onPlayerAdded: () => void;
}

export function AddPlayerModal({
  isOpen,
  onClose,
  teamId,
  seasonId,
  onPlayerAdded,
}: AddPlayerModalProps) {
  const [playerId, setPlayerId] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState<PlayerPosition>('Forward');
  const [leadershipRole, setLeadershipRole] = useState<LeadershipRole>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!playerId.trim()) {
      setError('Player ID is required');
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
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

      // Success - reset form and close modal
      setPlayerId('');
      setJerseyNumber('');
      setPosition('Forward');
      setLeadershipRole(null);
      onPlayerAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPlayerId('');
      setJerseyNumber('');
      setPosition('Forward');
      setLeadershipRole(null);
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player ID (temporary - will be replaced with player search) */}
            <div>
              <label htmlFor="playerId" className="block text-sm font-medium text-gray-700">
                Player ID
              </label>
              <input
                type="text"
                id="playerId"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter player UUID"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                TODO: Replace with player search/select component
              </p>
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
                disabled={loading}
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
