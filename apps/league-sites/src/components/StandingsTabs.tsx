'use client';

import { useState } from 'react';
import { StandingsTable } from './StandingsTable';
import type { Division, TeamStanding } from '@/lib/types';

interface StandingsTabsProps {
  standingsByDivision: Record<string, TeamStanding[]>;
  divisions: Division[];
}

export function StandingsTabs({
  standingsByDivision,
  divisions,
}: StandingsTabsProps) {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All Teams' },
    ...divisions.map((d) => ({ id: d.id, label: d.name })),
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`glass-control min-h-11 px-4 py-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--league-primary)] ${
              activeTab === tab.id
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass-card-strong overflow-x-auto">
        <StandingsTable standings={standingsByDivision[activeTab] || []} />
      </div>
    </div>
  );
}
