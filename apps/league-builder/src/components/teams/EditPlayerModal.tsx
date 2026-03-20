'use client';

import { useState, useEffect } from 'react';
import { PlayerPosition, RosterStatus, LeadershipRole } from '@/lib/actions/roster';

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  rosterId: string;
  onPlayerUpdated: () => void;
}

export function EditPlayerModal({
  isOpen,
  onClose,
  teamId,
  rosterId,
  onPlayerUpdated,
}: EditPlayerModalProps) {
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState<PlayerPosition>('Forward');
  const [status, setStatus] = useState<RosterStatus>('active');
  const [leadershipRole, setLeadershipRole] = useState<LeadershipRole>(null);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current roster entry when modal opens
  useEffect(() => {
    if (!isOpen || !rosterId) return;

    const fetchRosterEntry = async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/teams/${teamId}/roster?seasonId=all`);
        if (res.ok) {
          const data = await res.json();
          const entry = data.find((r: { id: string }) => r.id === rosterId);
          if (entry) {
            setJerseyNumber(String(entry.jersey_number));
            setPosition(entry.position);
            setStatus(entry.status);
            setLeadershipRole(entry.leadership_role);
            setPlayerName(entry.player?.full_name || 'Player');
          }
        }
      } catch {
        setError('Failed to load player data');
      } finally {
        setFetching(false);
      }
    };

    fetchRosterEntry();
  }, [isOpen, rosterId, teamId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const jerseyNum = parseInt(jerseyNumber);
    if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
      setError('Jersey number must be between 1 and 99');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/teams/${teamId}/roster/${rosterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jerseyNumber: jerseyNum,
          position,
          status,
          leadershipRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update player');
      }

      onPlayerUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
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
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Player {playerName && `- ${playerName}`}
            </h2>
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

          {fetching ? (
            <div className="flex justify-center p-8 text-gray-500">Loading player data...</div>
          ) : (
            <>
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Jersey Number */}
                <div>
                  <label htmlFor="editJerseyNumber" className="block text-sm font-medium text-gray-700">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    id="editJerseyNumber"
                    min="1"
                    max="99"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                    required
                  />
                </div>

                {/* Position */}
                <div>
                  <label htmlFor="editPosition" className="block text-sm font-medium text-gray-700">
                    Position
                  </label>
                  <select
                    id="editPosition"
                    value={position}
                    onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                    required
                  >
                    <option value="Forward">Forward</option>
                    <option value="Defense">Defense</option>
                    <option value="Goalie">Goalie</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="editStatus"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RosterStatus)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="injured">Injured</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Leadership Role */}
                <div>
                  <label htmlFor="editLeadershipRole" className="block text-sm font-medium text-gray-700">
                    Leadership Role
                  </label>
                  <select
                    id="editLeadershipRole"
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
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
