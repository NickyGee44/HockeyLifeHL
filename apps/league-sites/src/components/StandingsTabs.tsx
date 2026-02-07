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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        <StandingsTable standings={standingsByDivision[activeTab] || []} />
      </div>
    </div>
  );
}
