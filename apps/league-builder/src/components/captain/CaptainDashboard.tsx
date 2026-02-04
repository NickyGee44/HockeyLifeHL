'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import {
  Home,
  Users,
  UserPlus,
  Calendar,
  BarChart3,
  MapPin,
  Clock,
  Trophy,
} from 'lucide-react';
import JoinRequestsManager from './JoinRequestsManager';
import CaptainRosterManager from './CaptainRosterManager';

interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string | null;
  league_id: string;
  captain_id: string | null;
  max_roster_size: number | null;
}

interface Game {
  id: string;
  game_date: string;
  game_time: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team?: {
    id: string;
    name: string;
    short_name: string;
    logo_url: string | null;
  };
  away_team?: {
    id: string;
    name: string;
    short_name: string;
    logo_url: string | null;
  };
  venue?: {
    id: string;
    name: string;
    address: string | null;
  };
}

interface CaptainDashboardProps {
  teamId: string;
  team: Team;
  rosterCount: number;
  pendingRequestsCount: number;
  upcomingGames: Game[];
  initialTab: string;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'requests', label: 'Join Requests', icon: UserPlus },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
];

export default function CaptainDashboard({
  teamId,
  team,
  rosterCount,
  pendingRequestsCount,
  upcomingGames,
  initialTab,
}: CaptainDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentTab, setCurrentTab] = useState(initialTab);

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Roster Size"
                value={`${rosterCount}/${team.max_roster_size || 23}`}
                icon={<Users className="w-5 h-5 text-rink-500" />}
                subtitle={`${(team.max_roster_size || 23) - rosterCount} spots available`}
              />
              <StatCard
                title="Pending Requests"
                value={pendingRequestsCount}
                icon={<UserPlus className="w-5 h-5 text-yellow-500" />}
                subtitle={pendingRequestsCount > 0 ? 'Needs your review' : 'All caught up'}
                highlight={pendingRequestsCount > 0}
              />
              <StatCard
                title="Upcoming Games"
                value={upcomingGames.length}
                icon={<Calendar className="w-5 h-5 text-arena-500" />}
                subtitle="Next 5 games"
              />
            </div>

            {/* Upcoming Games */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Upcoming Games</h3>
              {upcomingGames.length === 0 ? (
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
                  <p className="text-neutral-400">No upcoming games scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingGames.map((game) => {
                    const isHome = game.home_team_id === teamId;
                    const opponent = isHome ? game.away_team : game.home_team;

                    return (
                      <div
                        key={game.id}
                        className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 hover:bg-neutral-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Date */}
                            <div className="text-center min-w-[60px]">
                              <div className="text-xs text-neutral-500">
                                {formatDate(game.game_date).split(',')[0]}
                              </div>
                              <div className="text-lg font-bold text-white">
                                {new Date(game.game_date).getDate()}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {formatDate(game.game_date).split(' ')[0]}
                              </div>
                            </div>

                            {/* Matchup */}
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <div className="text-sm font-semibold text-white">
                                  {team.short_name}
                                </div>
                                <div className="text-xs text-rink-500">
                                  {isHome ? 'Home' : 'Away'}
                                </div>
                              </div>
                              <div className="text-neutral-600 font-bold">VS</div>
                              <div className="text-center">
                                <div className="text-sm font-semibold text-white">
                                  {opponent?.short_name || 'TBD'}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {isHome ? 'Away' : 'Home'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Time & Venue */}
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm text-white mb-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(game.game_time)}
                            </div>
                            {game.venue && (
                              <div className="flex items-center gap-1 text-xs text-neutral-400">
                                <MapPin className="w-3 h-3" />
                                {game.venue.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => handleTabChange('requests')}
                className="p-6 bg-gradient-to-br from-rink-500/10 to-arena-500/10 border border-rink-500/30 rounded-xl text-left hover:scale-105 transition-transform"
              >
                <UserPlus className="w-8 h-8 text-rink-500 mb-2" />
                <h4 className="text-lg font-bold text-white mb-1">Review Join Requests</h4>
                <p className="text-sm text-neutral-400">
                  {pendingRequestsCount} pending request{pendingRequestsCount !== 1 ? 's' : ''}
                </p>
              </button>
              <button
                onClick={() => handleTabChange('roster')}
                className="p-6 bg-neutral-800/50 border border-neutral-700 rounded-xl text-left hover:scale-105 transition-transform"
              >
                <Users className="w-8 h-8 text-neutral-400 mb-2" />
                <h4 className="text-lg font-bold text-white mb-1">Manage Roster</h4>
                <p className="text-sm text-neutral-400">
                  {rosterCount} player{rosterCount !== 1 ? 's' : ''} on roster
                </p>
              </button>
            </div>
          </div>
        );

      case 'roster':
        return <CaptainRosterManager teamId={teamId} captainId={team.captain_id} />;

      case 'requests':
        return <JoinRequestsManager teamId={teamId} />;

      case 'schedule':
        return (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-neutral-600" />
            <h3 className="text-lg font-bold text-white mb-2">Full Schedule</h3>
            <p className="text-neutral-400 mb-6">
              View all games for your team in the season schedule.
            </p>
            <button
              onClick={() => router.push(`/dashboard/leagues/${team.league_id}/seasons`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rink-500 text-black font-semibold hover:bg-rink-400 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Go to Season Schedule
            </button>
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Wins"
                value={0}
                icon={<Trophy className="w-5 h-5 text-green-500" />}
                subtitle="This season"
              />
              <StatCard
                title="Losses"
                value={0}
                icon={<Trophy className="w-5 h-5 text-red-500" />}
                subtitle="This season"
              />
              <StatCard
                title="Ties"
                value={0}
                icon={<Trophy className="w-5 h-5 text-yellow-500" />}
                subtitle="This season"
              />
            </div>
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-neutral-600" />
              <h3 className="text-lg font-bold text-white mb-2">No Stats Yet</h3>
              <p className="text-neutral-400">
                Team statistics will appear here after games are played and scored.
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
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const showBadge = tab.id === 'requests' && pendingRequestsCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all relative',
                  isActive
                    ? 'bg-rink-500/10 text-rink-500 border border-rink-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  subtitle,
  highlight = false,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-4 border transition-all',
        highlight
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-neutral-800/50 border-neutral-700'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {subtitle && (
        <div
          className={cn(
            'text-xs',
            highlight ? 'text-yellow-400' : 'text-neutral-500'
          )}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
