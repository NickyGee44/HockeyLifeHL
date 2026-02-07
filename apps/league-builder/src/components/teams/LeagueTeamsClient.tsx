'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import {
  Users,
  Plus,
  Shield,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PendingTeamsTab } from './PendingTeamsTab';
import { getPendingTeamRegistrationRequestsCount } from '@/lib/actions/team-registration-requests';

interface Team {
  id: string;
  name: string;
  short_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  status: string | null;
  division_id: string | null;
  divisions: {
    id: string;
    name: string;
  } | null;
}

interface Division {
  id: string;
  name: string;
}

interface LeagueTeamsClientProps {
  leagueId: string;
  leagueName: string;
  locale: string;
  teams: Team[];
  divisions: Division[];
  initialTab?: string;
}

export function LeagueTeamsClient({
  leagueId,
  leagueName,
  locale,
  teams,
  divisions,
  initialTab = 'teams',
}: LeagueTeamsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || initialTab);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending count on mount
  useEffect(() => {
    async function fetchPendingCount() {
      const result = await getPendingTeamRegistrationRequestsCount(leagueId);
      if (result.success && result.data !== undefined) {
        setPendingCount(result.data);
      }
    }
    fetchPendingCount();
  }, [leagueId]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'teams') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Filter teams by division
  const filteredTeams = selectedDivision
    ? teams.filter((team) => team.division_id === selectedDivision)
    : teams;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => handleTabChange('teams')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === 'teams'
              ? 'bg-rink-500/20 text-rink-500 border border-rink-500/30'
              : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
          )}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Teams ({teams.length})
        </button>
        <button
          onClick={() => handleTabChange('pending')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors relative',
            activeTab === 'pending'
              ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
              : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
          )}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Pending Requests
          {pendingCount > 0 && (
            <span className={cn(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold',
              activeTab === 'pending'
                ? 'bg-yellow-500 text-black'
                : 'bg-yellow-500/80 text-black'
            )}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Teams Tab Content */}
      {activeTab === 'teams' && (
        <>
          {/* Division Filter */}
          {divisions && divisions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400">Divisions:</span>
                <button
                  onClick={() => setSelectedDivision(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    !selectedDivision
                      ? 'bg-rink-500/20 text-rink-500 border border-rink-500/30'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                  )}
                >
                  All
                </button>
                {divisions.map((div) => (
                  <button
                    key={div.id}
                    onClick={() => setSelectedDivision(div.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      selectedDivision === div.id
                        ? 'bg-rink-500/20 text-rink-500 border border-rink-500/30'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                    )}
                  >
                    {div.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teams Grid */}
          {filteredTeams && filteredTeams.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((team) => (
                <TeamCardInner
                  key={team.id}
                  team={team}
                  leagueId={leagueId}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
              <Users className="w-16 h-16 text-rink-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {selectedDivision ? 'No Teams in Division' : 'No Teams Yet'}
              </h3>
              <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                {selectedDivision
                  ? 'There are no teams assigned to this division yet.'
                  : 'Add teams to your league to start building rosters and scheduling games'}
              </p>
              {!selectedDivision && (
                <Link
                  href={`/${locale}/dashboard/leagues/${leagueId}/teams/new`}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                    'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                    'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Add First Team
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {/* Pending Requests Tab Content */}
      {activeTab === 'pending' && (
        <PendingTeamsTab
          leagueId={leagueId}
          leagueName={leagueName}
          initialDivisions={divisions}
        />
      )}
    </div>
  );
}

function TeamCardInner({
  team,
  leagueId,
  locale,
}: {
  team: Team;
  leagueId: string;
  locale: string;
}) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500 border-green-500/30',
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    inactive: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5 hover:border-white/20 transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: team.primary_color || '#22D3EE' }}
          >
            {team.short_name || team.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-rink-500 transition-colors">
              {team.name}
            </h3>
            {team.divisions && (
              <p className="text-sm text-neutral-500">{team.divisions.name}</p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/dashboard/teams/${team.id}`}>
                <Shield className="w-4 h-4 mr-2" />
                View Roster
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/dashboard/teams/${team.id}/settings`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Team
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-500">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            'px-2.5 py-1 text-xs font-semibold rounded-full border',
            statusColors[team.status || 'active'] || statusColors.active
          )}
        >
          {(team.status || 'active').charAt(0).toUpperCase() + (team.status || 'active').slice(1)}
        </span>

        <Link
          href={`/${locale}/dashboard/teams/${team.id}`}
          className="text-sm text-rink-500 hover:text-rink-400 font-medium"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}

export default LeagueTeamsClient;
