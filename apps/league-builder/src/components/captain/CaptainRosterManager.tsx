'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import {
  Users,
  Mail,
  Phone,
  Hash,
  AlertCircle,
  Loader2,
  UserX,
  Shield,
  Download,
} from 'lucide-react';
import { getCaptainTeamRoster, removePlayerFromRoster } from '@/lib/actions/captain';
import ImportRosterModal from './ImportRosterModal';

interface Player {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
}

interface RosterEntry {
  id: string;
  player_id: string;
  jersey_number: number | null;
  status: string;
  player?: Player;
  position?: string | null;
}

interface CaptainRosterManagerProps {
  teamId: string;
  captainId: string | null;
}

export default function CaptainRosterManager({ teamId, captainId }: CaptainRosterManagerProps) {
  const t = useTranslations('captain.roster');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);

  const loadRoster = async () => {
    setLoading(true);
    setError(null);
    const result = await getCaptainTeamRoster(teamId);
    if (result.error) {
      setError(result.error);
    } else {
      setRoster(result.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRoster();
  }, [teamId]);

  const handleRemovePlayer = async (playerId: string) => {
    // Confirm before removing
    if (!confirm('Are you sure you want to remove this player from the roster?')) {
      return;
    }

    setRemovingId(playerId);
    setError(null);

    const result = await removePlayerFromRoster(teamId, playerId);

    if (result.error) {
      setError(result.error);
    } else {
      // Remove from local state
      setRoster(roster.filter(r => r.player_id !== playerId));
    }

    setRemovingId(null);
  };

  const filteredRoster = roster.filter((entry) => {
    const playerName = (entry.player?.full_name ?? '').toLowerCase();
    const playerEmail = (entry.player?.email ?? '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return playerName.includes(search) || playerEmail.includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-rink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Team Roster</h2>
          <p className="text-sm text-neutral-400">
            {roster.length} player{roster.length !== 1 ? 's' : ''} on roster
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setImportModalOpen(true)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
              'bg-rink-500/10 text-rink-500 border border-rink-500/30',
              'hover:bg-rink-500/20 transition-colors'
            )}
          >
            <Download className="w-4 h-4" />
            {t('importFromPreviousSeason')}
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 pl-10 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-rink-500"
            />
            <Users className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Roster List */}
      {filteredRoster.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
            <Users className="w-8 h-8 text-neutral-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {searchTerm ? 'No players found' : 'No players on roster'}
          </h3>
          <p className="text-neutral-400">
            {searchTerm
              ? 'Try adjusting your search terms.'
              : 'Players will appear here once they join your team.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  #
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredRoster.map((entry) => {
                const isCaptain = entry.player_id === captainId;
                const isRemoving = removingId === entry.player_id;

                return (
                  <tr
                    key={entry.id}
                    className={cn(
                      'transition-colors',
                      isCaptain ? 'bg-rink-500/5' : 'hover:bg-neutral-800/50'
                    )}
                  >
                    {/* Jersey Number */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {entry.jersey_number !== null ? (
                          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 text-white font-bold text-sm">
                            {entry.jersey_number}
                          </span>
                        ) : (
                          <span className="text-neutral-600 text-sm">—</span>
                        )}
                      </div>
                    </td>

                    {/* Player Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {entry.player?.full_name || 'Unknown'}
                        </span>
                        {isCaptain && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rink-500/10 text-rink-500">
                            <Shield className="w-3 h-3" />
                            <span className="text-xs font-semibold">Captain</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Position */}
                    <td className="py-4 px-4">
                      {entry.position ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-medium">
                          {entry.position}
                        </span>
                      ) : (
                        <span className="text-neutral-600 text-sm">—</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {entry.player?.email && (
                          <div className="flex items-center gap-1 text-sm text-neutral-400">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {entry.player.email}
                            </span>
                          </div>
                        )}
                        {entry.player?.phone && (
                          <div className="flex items-center gap-1 text-sm text-neutral-400">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span>{entry.player.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      {!isCaptain && (
                        <button
                          onClick={() => handleRemovePlayer(entry.player_id)}
                          disabled={isRemoving}
                          className={cn(
                            'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                            isRemoving
                              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                              : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          )}
                        >
                          {isRemoving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Import Roster Modal */}
      <ImportRosterModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        teamId={teamId}
        onImportComplete={loadRoster}
      />
    </div>
  );
}
