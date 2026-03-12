'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { Users, LayoutGrid, UserX, Trophy, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { LeagueTeamsClient } from '@/components/teams/LeagueTeamsClient';
import { DivisionList } from '@/components/divisions';

interface FreeAgentPlayer {
  id: string;
  player_id: string;
  status: string;
  preferred_position: string | null;
  preferred_jersey_number: number | null;
  payment_status: string;
  amount_paid_cents: number;
  submitted_at: string;
  player: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface TeamsDivisionsClientProps {
  leagueId: string;
  leagueName: string;
  leaguePrimaryColor: string | null;
  locale: string;
  teams: any[];
  divisions: any[];
  freeAgentPlayers: FreeAgentPlayer[];
  totalTeams: number;
  unassignedTeams: number;
  initialTab: string;
}

export function TeamsDivisionsClient({
  leagueId,
  leagueName,
  locale,
  teams,
  divisions,
  freeAgentPlayers,
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
      count: freeAgentPlayers.length,
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
          seasons={[]}
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
          {freeAgentPlayers.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
              <UserX className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Free Agents</h3>
              <p className="text-neutral-400 max-w-md mx-auto">
                All registered players have been assigned to a team, or no players have registered yet.
              </p>
            </div>
          ) : (
            <>
              <p className="text-neutral-400 text-sm">
                {freeAgentPlayers.length} player{freeAgentPlayers.length !== 1 ? 's' : ''} registered but not assigned to a team
              </p>
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/10 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <span>Player</span>
                  <span className="text-center w-20">Position</span>
                  <span className="text-center w-10">#</span>
                  <span className="text-center w-24">Payment</span>
                </div>
                <div className="divide-y divide-white/5">
                  {freeAgentPlayers.map((fa) => {
                    const name = fa.player?.full_name || 'Unknown';
                    const email = fa.player?.email || '';
                    const phone = fa.player?.phone || null;
                    const position = fa.preferred_position || '—';
                    const jersey = fa.preferred_jersey_number ?? null;
                    const paid = fa.payment_status === 'completed';
                    const free = fa.payment_status === 'not_required';
                    const pending = fa.payment_status === 'pending' || (!paid && !free);

                    return (
                      <div
                        key={fa.id}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Player info */}
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{name}</p>
                          <p className="text-xs text-neutral-500 truncate">{email}</p>
                          {phone && <p className="text-xs text-neutral-600 truncate">{phone}</p>}
                        </div>

                        {/* Position */}
                        <span className="w-20 text-center text-sm text-neutral-300">
                          {position}
                        </span>

                        {/* Jersey number */}
                        <span className="w-10 text-center text-sm text-neutral-300">
                          {jersey !== null ? `#${jersey}` : '—'}
                        </span>

                        {/* Payment status */}
                        <div className="w-24 flex justify-center">
                          {paid && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Paid
                            </span>
                          )}
                          {free && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-700/50 text-neutral-400 text-xs font-medium">
                              <DollarSign className="w-3 h-3" />
                              Free
                            </span>
                          )}
                          {pending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium">
                              <Clock className="w-3 h-3" />
                              Unpaid
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
