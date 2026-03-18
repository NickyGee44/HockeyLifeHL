'use client';

import { useState } from 'react';
import { cn } from '@hockey-life/ui';
import { Users, Shield, Scale } from 'lucide-react';

interface RatingsTabsProps {
  playerContent: React.ReactNode;
  teamContent: React.ReactNode;
  divisionContent: React.ReactNode;
  hasDivisions: boolean;
}

const TABS = [
  { id: 'players', label: 'Player Ratings', icon: Users },
  { id: 'teams', label: 'Team Ratings', icon: Shield },
  { id: 'divisions', label: 'Balance Divisions', icon: Scale },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function RatingsTabs({
  playerContent,
  teamContent,
  divisionContent,
  hasDivisions,
}: RatingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('players');

  const visibleTabs = hasDivisions ? TABS : TABS.filter((t) => t.id !== 'divisions');

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
                isActive
                  ? 'bg-rink-500/20 text-rink-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'players' && playerContent}
      {activeTab === 'teams' && teamContent}
      {activeTab === 'divisions' && divisionContent}
    </div>
  );
}
