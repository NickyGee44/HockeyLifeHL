'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LeagueReferee } from '@/lib/actions/referee-management';
import { RefereeCard } from './referee-card';
import { Users, Search, RefreshCw, Loader2 } from 'lucide-react';

interface RefereesListProps {
  referees: LeagueReferee[];
  selectedIds: Set<string>;
  onSelectReferee: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
  onEdit: (referee: LeagueReferee) => void;
  onRemove: (referee: LeagueReferee) => void;
  onAssignGames: (referee: LeagueReferee) => void;
  onRequestAvailability: (referee: LeagueReferee) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function RefereesList({
  referees,
  selectedIds,
  onSelectReferee,
  onSelectAll,
  onEdit,
  onRemove,
  onAssignGames,
  onRequestAvailability,
  onRefresh,
  isLoading,
}: RefereesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReferees = referees.filter((ref) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = ref.name.toLowerCase();
    const email = (ref.email || '').toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const isAllSelected = filteredReferees.length > 0 &&
    filteredReferees.every((ref) => selectedIds.has(ref.id));

  return (
    <div className="space-y-4">
      {/* Search and controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Search referees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-neutral-900 border-white/10 text-white placeholder:text-neutral-500"
          />
        </div>

        {filteredReferees.length > 0 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={onSelectAll}
              className="w-4 h-4 rounded border-rink-500/30 bg-neutral-800 text-rink-500 focus:ring-rink-500 focus:ring-offset-neutral-900"
            />
            <span className="text-sm text-neutral-400">
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </span>
          </label>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2 border-white/10 text-neutral-300 hover:bg-neutral-800"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Count */}
      <p className="text-sm text-neutral-500">
        {filteredReferees.length} referee{filteredReferees.length !== 1 ? 's' : ''}
        {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
      </p>

      {/* List */}
      {filteredReferees.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            {searchQuery ? 'No referees found' : 'No referees yet'}
          </h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : 'Add staff members with a "Referee" role to see them here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReferees.map((referee) => (
            <RefereeCard
              key={referee.id}
              referee={referee}
              selected={selectedIds.has(referee.id)}
              onSelect={(selected) => onSelectReferee(referee.id, selected)}
              onEdit={() => onEdit(referee)}
              onRemove={() => onRemove(referee)}
              onAssignGames={() => onAssignGames(referee)}
              onRequestAvailability={() => onRequestAvailability(referee)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
