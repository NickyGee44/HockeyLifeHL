'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Users,
  Calendar,
  BarChart3,
  UserPlus,
  Trophy,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { RosterTable } from '@/components/teams/RosterTable';
import { AddPlayerModalEnhanced } from '@/components/teams/AddPlayerModalEnhanced';
import { RosterExportButton } from '@/components/teams/RosterExportButton';
import { TeamEmailBlast } from '@/components/teams/TeamEmailBlast';

interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string | null;
  roster_count: number;
  max_roster_size: number | null;
  captain_id: string | null;
  captain_name: string | null;
  division_name: string | null;
  league_id: string;
  leagues?: any;
}

interface TeamDetailClientProps {
  team: Team;
  initialTab: string;
}

const TABS = [
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
];

export default function TeamDetailClient({ team, initialTab }: TeamDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'roster':
        return (
          <div className="space-y-6">
            {/* Roster Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Team Roster</h2>
                <p className="text-sm text-neutral-400">
                  {team.roster_count} of {team.max_roster_size ?? 23} players
                </p>
              </div>
              <div className="flex items-center gap-2">
                <TeamEmailBlast teamId={team.id} teamName={team.name} />
                <RosterExportButton teamId={team.id} />
                <button
                  onClick={() => setIsAddPlayerOpen(true)}
                  disabled={team.roster_count >= (team.max_roster_size ?? 23)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm',
                    team.roster_count >= (team.max_roster_size ?? 23)
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20 transition-all'
                  )}
                >
                  <UserPlus className="w-4 h-4" />
                  Add Player
                </button>
              </div>
            </div>

            {/* Roster Warning if Full */}
            {team.roster_count >= (team.max_roster_size ?? 23) && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <p className="text-sm text-yellow-400">
                  Roster is full. Remove a player or increase the roster limit in settings.
                </p>
              </div>
            )}

            {/* Roster Table */}
            <RosterTable teamId={team.id} />
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Team Schedule</h2>
            </div>

            {/* Placeholder for schedule */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rink-500/10 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-rink-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Games Scheduled</h3>
              <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                Games will appear here once the season schedule is generated.
              </p>
              <Link
                href={`/dashboard/leagues/${team.league_id}/seasons`}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                  'bg-rink-500/10 text-rink-500 border border-rink-500/30',
                  'hover:bg-rink-500/20 transition-colors'
                )}
              >
                <Clock className="w-4 h-4" />
                Go to Seasons
              </Link>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Team Statistics</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <StatCard title="Wins" value={0} icon={<Trophy className="w-5 h-5 text-green-500" />} />
              <StatCard title="Losses" value={0} icon={<Trophy className="w-5 h-5 text-red-500" />} />
              <StatCard title="Ties" value={0} icon={<Trophy className="w-5 h-5 text-yellow-500" />} />
            </div>

            {/* Placeholder for stats */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rink-500/10 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-rink-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Stats Yet</h3>
              <p className="text-neutral-400 max-w-md mx-auto">
                Player and team statistics will appear here after games are played and scored.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-2">
        <div className="flex gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all',
                  isActive
                    ? 'bg-rink-500/10 text-rink-500 border border-rink-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
        {renderTabContent()}
      </div>

      {/* Add Player Modal */}
      <AddPlayerModalEnhanced
        isOpen={isAddPlayerOpen}
        onClose={() => setIsAddPlayerOpen(false)}
        teamId={team.id}
        leagueId={team.league_id}
        onSuccess={() => {
          setIsAddPlayerOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
