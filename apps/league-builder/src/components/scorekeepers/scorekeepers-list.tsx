'use client';

import { useState, useCallback } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import type { LeagueScorekeeper } from '@/lib/actions/scorekeeper-management';
import { ScorekeeperCard } from './scorekeeper-card';
import { Users, Search, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ScorekeepersListProps {
  scorekeepers: LeagueScorekeeper[];
  selectedIds: Set<string>;
  onSelectScorekeeper: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
  onEdit: (scorekeeper: LeagueScorekeeper) => void;
  onRemove: (scorekeeper: LeagueScorekeeper) => void;
  onAssignGames: (scorekeeper: LeagueScorekeeper) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function ScorekeepersList({
  scorekeepers,
  selectedIds,
  onSelectScorekeeper,
  onSelectAll,
  onEdit,
  onRemove,
  onAssignGames,
  onRefresh,
  isLoading,
}: ScorekeepersListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredScorekepers = scorekeepers.filter((sk) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = (sk.display_name || sk.profile?.full_name || '').toLowerCase();
    const email = (sk.email || sk.profile?.email || '').toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const isAllSelected = filteredScorekepers.length > 0 &&
    filteredScorekepers.every(sk => selectedIds.has(sk.id));

  return (
    <div className="space-y-4">
      {/* Search and controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Search scorekeepers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-neutral-900 border-white/10 text-white placeholder:text-neutral-500"
          />
        </div>

        {filteredScorekepers.length > 0 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={onSelectAll}
              className="w-4 h-4 rounded border-rink-500/30 bg-neutral-800 text-rink-500 focus:ring-rink-500 focus:ring-offset-neutral-900"
            />
            <span className="text-sm text-neutral-400">
              {isAllSelected ? 'Deselect all' : 'Select all'}
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
        {filteredScorekepers.length} scorekeeper{filteredScorekepers.length !== 1 ? 's' : ''}
        {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
      </p>

      {/* List */}
      {filteredScorekepers.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-rink-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            {searchQuery ? 'No Scorekeepers Found' : 'No Scorekeepers Yet'}
          </h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            {searchQuery
              ? 'No scorekeepers match your search. Try a different query.'
              : 'Add scorekeepers to manage game assignments for your league.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScorekepers.map((scorekeeper) => (
            <ScorekeeperCard
              key={scorekeeper.id}
              scorekeeper={scorekeeper}
              selected={selectedIds.has(scorekeeper.id)}
              onSelect={(selected) => onSelectScorekeeper(scorekeeper.id, selected)}
              onEdit={() => onEdit(scorekeeper)}
              onRemove={() => onRemove(scorekeeper)}
              onAssignGames={() => onAssignGames(scorekeeper)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
