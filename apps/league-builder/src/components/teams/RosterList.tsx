'use client';

import { useState, useEffect } from 'react';
import { PlayerPosition, RosterStatus, LeadershipRole } from '@/lib/actions/roster';

interface RosterPlayer {
  id: string;
  player_id: string;
  jersey_number: number;
  position: PlayerPosition;
  status: RosterStatus;
  leadership_role: LeadershipRole;
  start_date: string;
  end_date?: string;
  player: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface RosterListProps {
  teamId: string;
  seasonId: string;
  onEditPlayer?: (rosterId: string) => void;
  onRemovePlayer?: (rosterId: string) => void;
}

export function RosterList({ teamId, seasonId, onEditPlayer, onRemovePlayer }: RosterListProps) {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoster();
  }, [teamId, seasonId]);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamId}/roster?seasonId=${seasonId}`);

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

  const handleRemovePlayer = async (rosterId: string) => {
    if (!confirm('Are you sure you want to remove this player from the roster?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/roster/${rosterId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove player');
      }

      // Refresh roster
      await fetchRoster();

      if (onRemovePlayer) {
        onRemovePlayer(rosterId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove player');
    }
  };

  const getPositionBadgeColor = (position: PlayerPosition) => {
    switch (position) {
      case 'Forward':
        return 'bg-blue-100 text-blue-800';
      case 'Defense':
        return 'bg-green-100 text-green-800';
      case 'Goalie':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: RosterStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'injured':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      case 'inactive':
      case 'traded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500">Loading roster...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchRoster}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No players on roster yet.</p>
      </div>
    );
  }

  // Sort by position (Goalie, Defense, Forward) and then by jersey number
  const sortedRoster = [...roster].sort((a, b) => {
    const positionOrder: Record<string, number> = { Goalie: 0, Defense: 1, Forward: 2 };
    const posA = positionOrder[a.position] ?? 3;
    const posB = positionOrder[b.position] ?? 3;

    if (posA !== posB) {
      return posA - posB;
    }

    return a.jersey_number - b.jersey_number;
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              #
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Player
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Position
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedRoster.map((player) => (
            <tr key={player.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {player.jersey_number}
                  </span>
                  {player.leadership_role && (
                    <span className="ml-2 text-yellow-500 text-xl">
                      {player.leadership_role === 'captain' ? 'C' : 'A'}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {player.player.full_name}
                </div>
                <div className="text-sm text-gray-500">{player.player.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPositionBadgeColor(
                    player.position
                  )}`}
                >
                  {player.position.charAt(0).toUpperCase() + player.position.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                    player.status
                  )}`}
                >
                  {player.status.charAt(0).toUpperCase() + player.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {player.leadership_role ? (
                  <span className="font-medium">
                    {player.leadership_role === 'captain' ? 'Captain' : 'Alternate'}
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEditPlayer?.(player.id)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleRemovePlayer(player.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-sm text-gray-500">
        Total Players: {roster.length} / 20
      </div>
    </div>
  );
}
