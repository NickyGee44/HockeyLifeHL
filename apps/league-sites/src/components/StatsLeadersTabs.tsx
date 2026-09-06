'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Target, Shield, Search, X } from 'lucide-react';
import type { PlayerStatsWithAvatar } from '@/lib/types';

interface StatsLeadersTabsProps {
  pointsLeaders: PlayerStatsWithAvatar[];
  goalsLeaders: PlayerStatsWithAvatar[];
  assistsLeaders: PlayerStatsWithAvatar[];
  leagueSlug: string;
}

type TabType = 'points' | 'goals' | 'assists';

export function StatsLeadersTabs({
  pointsLeaders,
  goalsLeaders,
  assistsLeaders,
  leagueSlug,
}: StatsLeadersTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('points');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Goalies have a dedicated /stats/goalies page — exclude them from skater leaderboards
  const isGoalie = (p: PlayerStatsWithAvatar) => {
    const pos = p.position?.toLowerCase();
    return pos === 'goalie' || pos === 'g';
  };

  const tabs = [
    { id: 'points' as TabType, label: 'Points', icon: Trophy, data: pointsLeaders.filter(p => !isGoalie(p)) },
    { id: 'goals' as TabType, label: 'Goals', icon: Target, data: goalsLeaders.filter(p => !isGoalie(p)) },
    { id: 'assists' as TabType, label: 'Assists', icon: Shield, data: assistsLeaders.filter(p => !isGoalie(p)) },
  ];

  const activeData = tabs.find((t) => t.id === activeTab)?.data || [];

  // Filter data based on search term
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const isSearching = normalizedSearch.length > 0;
  const filteredData = isSearching
    ? activeData.filter(
        (player) =>
          player.player_name.toLowerCase().includes(normalizedSearch) ||
          player.team_name.toLowerCase().includes(normalizedSearch)
      )
    : showAll
      ? activeData
      : activeData.slice(0, 10);
  const hasMorePlayers = !isSearching && activeData.length > 10;

  return (
    <div>
      {/* Search and Tabs Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`glass-control flex min-h-11 items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--league-primary)] ${
                activeTab === tab.id
                  ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="glass-control relative max-w-xs w-full rounded-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search players..."
            className="
              min-h-11 w-full pl-10 pr-12 py-2 rounded-xl text-sm
              bg-[var(--color-surface-hover)] border border-[var(--color-border)]
              text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]
              focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
              transition-all duration-200
            "
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--league-primary)]"
              aria-label="Clear player search"
            >
              <X className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="glass-card-strong overflow-x-auto">
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="standings-table w-full">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Player</th>
                <th>Team</th>
                <th className="text-center">GP</th>
                <th className="text-center">G</th>
                <th className="text-center">A</th>
                <th className="text-center font-bold">PTS</th>
                <th className="text-center hidden md:table-cell">PIM</th>
                <th className="text-center hidden md:table-cell">+/-</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((player, index) => {
                // Find original rank
                const originalRank = activeData.findIndex((p) => p.player_id === player.player_id);
                const isHighlighted = isSearching && (
                  player.player_name.toLowerCase().includes(normalizedSearch) ||
                  player.team_name.toLowerCase().includes(normalizedSearch)
                );
                const playerProfileId = player.player_id || null;
                return (
                  <tr
                    key={`${player.player_id}-${index}`}
                    className={`
                      ${originalRank < 3 ? 'highlight' : ''}
                      ${isHighlighted ? 'bg-[var(--league-primary)]/10 border-l-2 border-l-[var(--league-primary)]' : ''}
                    `}
                  >
                    <td>
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          originalRank === 0
                            ? 'bg-gold-500 text-black'
                            : originalRank === 1
                            ? 'bg-slate-300/80 text-slate-950'
                            : originalRank === 2
                            ? 'bg-amber-700 text-white'
                            : 'glass-control text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {originalRank + 1}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <img
                          src={player.avatar_url || '/blank_player.png'}
                          alt={player.player_name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[var(--color-border)]"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            {playerProfileId ? (
                              <Link
                                href={`/${leagueSlug}/players/${playerProfileId}`}
                                className={`font-medium hover:text-[var(--league-primary)] transition-colors ${isHighlighted ? 'text-[var(--league-primary)]' : ''}`}
                              >
                                {player.player_name}
                              </Link>
                            ) : (
                              <span className={`font-medium ${isHighlighted ? 'text-[var(--league-primary)]' : ''}`}>
                                {player.player_name}
                              </span>
                            )}
                          </div>
                          {player.position && (
                            <div className="text-xs text-[var(--color-text-muted)]">
                              {player.position}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-[var(--color-text-secondary)]">
                      {player.team_id ? (
                        <Link
                          href={`/${leagueSlug}/teams/id/${player.team_id}`}
                          className="hover:text-[var(--league-primary)] transition-colors"
                        >
                          {player.team_name}
                        </Link>
                      ) : (
                        player.team_name
                      )}
                    </td>
                    <td className="text-center">{player.games_played}</td>
                    <td className="text-center">{player.goals}</td>
                    <td className="text-center">{player.assists}</td>
                    <td className="text-center font-bold text-[var(--color-text-primary)]">
                      {player.points}
                    </td>
                    <td className="text-center hidden md:table-cell">
                      {player.penalty_minutes}
                    </td>
                    <td className="text-center hidden md:table-cell">
                      <span
                        className={
                          player.plus_minus > 0
                            ? 'text-green-500'
                            : player.plus_minus < 0
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {player.plus_minus > 0 ? '+' : ''}
                        {player.plus_minus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        ) : isSearching ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)]">
              No players found matching &quot;{searchTerm}&quot;
            </p>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-[var(--color-text-secondary)]">
              No stats available for this category.
            </p>
          </div>
        )}
      </div>

      {/* Show All / Show Less toggle */}
      {hasMorePlayers && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="glass-control mt-4 min-h-11 w-full rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--league-primary)]"
        >
          {showAll ? 'Show Top 10' : `Show All ${activeData.length} Players`}
        </button>
      )}
    </div>
  );
}
