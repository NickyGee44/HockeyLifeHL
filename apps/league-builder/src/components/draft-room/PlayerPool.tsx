'use client';

import { useState, useMemo } from 'react';
import { Search, User, Filter } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import type { DraftPlayer } from './types';

interface PlayerPoolProps {
  players: DraftPlayer[];
  onSelectPlayer: (player: DraftPlayer) => void;
  selectedPlayerId?: string | null;
  canPick: boolean;
  isLoading?: boolean;
}

const POSITIONS = ['All', 'C', 'LW', 'RW', 'D', 'G'] as const;
const SKILL_LEVELS = ['All', 'A', 'B', 'C', 'D'] as const;

export function PlayerPool({
  players,
  onSelectPlayer,
  selectedPlayerId,
  canPick,
  isLoading = false,
}: PlayerPoolProps) {
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('All');
  const [skillFilter, setSkillFilter] = useState<string>('All');

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch =
        search === '' ||
        player.player_name.toLowerCase().includes(search.toLowerCase());
      const matchesPosition =
        positionFilter === 'All' || player.player_position === positionFilter;
      const matchesSkill =
        skillFilter === 'All' || player.skill_level === skillFilter;
      return matchesSearch && matchesPosition && matchesSkill;
    });
  }, [players, search, positionFilter, skillFilter]);

  const positionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: players.length };
    players.forEach((p) => {
      if (p.player_position) {
        counts[p.player_position] = (counts[p.player_position] || 0) + 1;
      }
    });
    return counts;
  }, [players]);

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Available Players</h2>
        <p className="text-sm text-muted-foreground">
          {filteredPlayers.length} of {players.length} players
        </p>
      </div>

      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 border-b p-3">
        {/* Position filter */}
        <div className="flex flex-wrap gap-1">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPositionFilter(pos)}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                positionFilter === pos
                  ? 'bg-gold-500 text-black'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {pos}
              {positionCounts[pos] !== undefined && (
                <span className="ml-1 opacity-70">({positionCounts[pos]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Skill filter */}
      <div className="flex gap-2 border-b p-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {SKILL_LEVELS.map((skill) => (
          <button
            key={skill}
            onClick={() => setSkillFilter(skill)}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              skillFilter === skill
                ? 'bg-gold-500 text-black'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {skill === 'All' ? 'All Skills' : `Skill ${skill}`}
          </button>
        ))}
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No players found</p>
          </div>
        ) : (
          <ul className="divide-y">
            {filteredPlayers.map((player) => (
              <li key={player.player_id}>
                <button
                  onClick={() => canPick && onSelectPlayer(player)}
                  disabled={!canPick}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors',
                    canPick && 'hover:bg-muted/50',
                    !canPick && 'cursor-not-allowed opacity-50',
                    selectedPlayerId === player.player_id &&
                      'bg-gold-500/10 ring-1 ring-inset ring-gold-500'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Position badge */}
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
                          player.player_position === 'G'
                            ? 'bg-blue-500/20 text-blue-500'
                            : player.player_position === 'D'
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-gold-500/20 text-gold-500'
                        )}
                      >
                        {player.player_position || '?'}
                      </span>
                      <div>
                        <p className="font-medium">{player.player_name}</p>
                        {player.skill_level && (
                          <p className="text-xs text-muted-foreground">
                            Skill Level: {player.skill_level}
                          </p>
                        )}
                      </div>
                    </div>
                    {player.auto_pick_rank && (
                      <span className="text-xs text-muted-foreground">
                        #{player.auto_pick_rank}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
