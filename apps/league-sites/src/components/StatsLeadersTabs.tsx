'use client';

import { useState } from 'react';
import { Trophy, Target, Shield } from 'lucide-react';
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

  const tabs = [
    { id: 'points' as TabType, label: 'Points', icon: Trophy, data: pointsLeaders },
    { id: 'goals' as TabType, label: 'Goals', icon: Target, data: goalsLeaders },
    { id: 'assists' as TabType, label: 'Assists', icon: Shield, data: assistsLeaders },
  ];

  const activeData = tabs.find((t) => t.id === activeTab)?.data || [];

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      {/* Content */}
      <div className="card overflow-hidden">
        {activeData.length > 0 ? (
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
              {activeData.map((player, index) => (
                <tr
                  key={player.player_id}
                  className={index < 3 ? 'highlight' : ''}
                >
                  <td>
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        index === 0
                          ? 'bg-gold-500 text-black'
                          : index === 1
                          ? 'bg-gray-400 text-black'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td>
                    <div className="font-medium">{player.player_name}</div>
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
              ))}
            </tbody>
          </table>
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
