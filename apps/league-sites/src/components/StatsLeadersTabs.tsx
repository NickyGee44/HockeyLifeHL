'use client';

import { useState } from 'react';
import { Trophy, Target, Shield, Search, X } from 'lucide-react';
import type { PlayerStats } from '@/lib/types';

interface StatsLeadersTabsProps {
  pointsLeaders: PlayerStats[];
  goalsLeaders: PlayerStats[];
  assistsLeaders: PlayerStats[];
}

type TabType = 'points' | 'goals' | 'assists';

export function StatsLeadersTabs({
  pointsLeaders,
  goalsLeaders,
  assistsLeaders,
}: StatsLeadersTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('points');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'points' as TabType, label: 'Points', icon: Trophy, data: pointsLeaders },
    { id: 'goals' as TabType, label: 'Goals', icon: Target, data: goalsLeaders },
    { id: 'assists' as TabType, label: 'Assists', icon: Shield, data: assistsLeaders },
  ];

  const activeData = tabs.find((t) => t.id === activeTab)?.data || [];

  // Filter data based on search term
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const filteredData = normalizedSearch
    ? activeData.filter(
        (player) =>
          player.player_name.toLowerCase().includes(normalizedSearch) ||
          player.team_name.toLowerCase().includes(normalizedSearch)
      )
    : activeData;

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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--league-primary)] text-[var(--color-background)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search players..."
            className="
              w-full pl-10 pr-10 py-2 rounded-lg text-sm
              bg-[var(--color-surface-hover)] border border-[var(--color-border)]
              text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]
              focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
              transition-all duration-200
            "
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--color-border)] transition-colors"
            >
              <X className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        {filteredData.length > 0 ? (
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
              {filteredData.map((player) => {
                // Find original rank
                const originalRank = activeData.findIndex((p) => p.player_id === player.player_id);
                const isHighlighted = normalizedSearch && (
                  player.player_name.toLowerCase().includes(normalizedSearch) ||
                  player.team_name.toLowerCase().includes(normalizedSearch)
                );

                return (
                  <tr
                    key={player.player_id}
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
                            ? 'bg-gray-400 text-black'
                            : originalRank === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {originalRank + 1}
                      </span>
                    </td>
                    <td>
                      <div className={`font-medium ${isHighlighted ? 'text-[var(--league-primary)]' : ''}`}>
                        {player.player_name}
                      </div>
                      {player.position && (
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {player.position}
                        </div>
                      )}
                    </td>
                    <td className="text-[var(--color-text-secondary)]">
                      {player.team_name}
                    </td>
                    <td className="text-center">{player.games_played}</td>
                    <td className="text-center">{player.goals}</td>
                    <td className="text-center">{player.assists}</td>
                    <td className="text-center font-bold text-[var(--league-primary)]">
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
        ) : searchTerm ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)]">
              No players found matching "{searchTerm}"
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
    </div>
  );
}
