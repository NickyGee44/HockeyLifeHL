'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { Users, LayoutGrid, UserX, Trophy } from 'lucide-react';
import { LeagueTeamsClient } from '@/components/teams/LeagueTeamsClient';
import { DivisionList } from '@/components/divisions';

interface TeamsDivisionsClientProps {
  leagueId: string;
  leagueName: string;
  leaguePrimaryColor: string | null;
  locale: string;
  teams: any[];
  divisions: any[];
  totalTeams: number;
  unassignedTeams: number;
  initialTab: string;
}

export function TeamsDivisionsClient({
  leagueId,
  leagueName,
  leaguePrimaryColor,
  locale,
  teams,
  divisions,
  totalTeams,
  unassignedTeams,
  initialTab,
}: TeamsDivisionsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || initialTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'teams') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const freeAgents = teams.filter((t) => !t.division_id);

  const tabs = [
    {
      id: 'teams',
      label: 'Teams',
      icon: Users,
      count: teams.length,
    },
    {
      id: 'divisions',
      label: 'Divisions',
      icon: LayoutGrid,
      count: divisions.length,
    },
    {
      id: 'free-agents',
      label: 'Free Agents',
      icon: UserX,
      count: freeAgents.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-rink-500/20 text-rink-500 border border-rink-500/30'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
              )}
            >
              <Icon className="w-4 h-4 inline mr-2" />
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <LeagueTeamsClient
          leagueId={leagueId}
          leagueName={leagueName}
          locale={locale}
          teams={teams}
          divisions={divisions}
          initialTab="teams"
        />
      )}

      {/* Divisions Tab */}
      {activeTab === 'divisions' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-5 h-5 text-rink-500" />
                <span className="text-sm text-neutral-400">Total Divisions</span>
              </div>
              <p className="text-2xl font-bold text-white">{divisions.length}</p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-rink-500" />
                <span className="text-sm text-neutral-400">Total Teams</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalTeams}</p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-neutral-400">Unassigned Teams</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {unassignedTeams}
                {unassignedTeams > 0 && (
                  <span className="text-sm font-normal text-yellow-500 ml-2">
                    needs attention
                  </span>
                )}
              </p>
            </div>
          </div>

          <DivisionList
            leagueId={leagueId}
            locale={locale}
            initialDivisions={divisions}
          />
        </div>
      )}

      {/* Free Agents Tab */}
      {activeTab === 'free-agents' && (
        <div className="space-y-4">
          {freeAgents.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
              <UserX className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Free Agents</h3>
              <p className="text-neutral-400 max-w-md mx-auto">
                All teams are assigned to divisions. Free agents are teams without a division assignment.
              </p>
            </div>
          ) : (
            <>
              <p className="text-neutral-400 text-sm">
                {freeAgents.length} team{freeAgents.length !== 1 ? 's' : ''} not assigned to any division
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {freeAgents.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/10 rounded-xl"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: team.primary_color || '#22D3EE' }}
                    >
                      {team.short_name || team.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{team.name}</p>
                      <p className="text-xs text-yellow-500">No division</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
