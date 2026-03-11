'use client';

import { useState} from 'react';
import { useTranslations } from 'next-intl';
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
  onRequestAvailability: (scorekeeper: LeagueScorekeeper) => void;
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
  onRequestAvailability,
  onRefresh,
  isLoading }: ScorekeepersListProps) {
  const t = useTranslations('scorekeepers.list');
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
            placeholder={t('searchPlaceholder')}
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
              {isAllSelected ? t('deselectAll') : t('selectAll')}
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
          {t('refresh')}
        </Button>
      </div>

      {/* Count */}
      <p className="text-sm text-neutral-500">
        {t('count', { count: filteredScorekepers.length })}
        {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
      </p>

      {/* List */}
      {filteredScorekepers.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-rink-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            {searchQuery ? t('noScorekeepersFound') : t('noScorekeepersYet')}
          </h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            {searchQuery
              ? t('noMatchSearch')
              : t('addToManage')}
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
              onRequestAvailability={() => onRequestAvailability(scorekeeper)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
