'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { Plus, Search, Filter, Users, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TeamCard } from '@/components/teams';

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
  captain_name: string | null;
  division_name: string | null;
  league_name: string | null;
  league_id: string;
}

interface TeamsListClientProps {
  teams: Team[];
  initialSearch: string;
  initialStatus: string;
}

export default function TeamsListClient({
  teams,
  initialSearch,
  initialStatus,
}: TeamsListClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        !searchQuery ||
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.league_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = !statusFilter || team.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teams, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: teams.length,
      active: teams.filter((t) => t.status === 'active').length,
      pending: teams.filter((t) => t.status === 'pending').length,
      inactive: teams.filter((t) => t.status === 'inactive').length,
    };
  }, [teams]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
  };

  const hasActiveFilters = searchQuery || statusFilter;

  // Group teams by league
  const teamsByLeague = useMemo(() => {
    const grouped = new Map<string, { name: string; teams: Team[] }>();

    filteredTeams.forEach((team) => {
      const leagueId = team.league_id;
      if (!grouped.has(leagueId)) {
        grouped.set(leagueId, { name: team.league_name || 'Unknown League', teams: [] });
      }
      grouped.get(leagueId)!.teams.push(team);
    });

    return Array.from(grouped.entries()).sort((a, b) =>
      a[1].name.localeCompare(b[1].name)
    );
  }, [filteredTeams]);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search teams by name or league..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {[
            { value: '', label: 'All', count: statusCounts.all },
            { value: 'active', label: 'Active', count: statusCounts.active },
            { value: 'pending', label: 'Pending', count: statusCounts.pending },
            { value: 'inactive', label: 'Inactive', count: statusCounts.inactive },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleStatusChange(filter.value)}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-xl transition-all',
                statusFilter === filter.value
                  ? 'bg-gold-500/20 text-gold-500 border border-gold-500/30'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white border border-transparent'
              )}
            >
              {filter.label}
              {filter.count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({filter.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          Showing {filteredTeams.length} of {teams.length} teams
        </p>
      </div>

      {/* Teams Display */}
      {filteredTeams.length === 0 ? (
        <div className="bg-neutral-900 border border-gold-500/20 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold-500/10 flex items-center justify-center">
            <Users className="w-10 h-10 text-gold-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            {teams.length === 0 ? 'No Teams Yet' : 'No Matching Teams'}
          </h2>
          <p className="text-neutral-400 mb-8 max-w-md mx-auto">
            {teams.length === 0
              ? 'Create your first team by going to a league and adding a team.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {teams.length === 0 && (
            <Link
              href="/dashboard/leagues"
              className={cn(
                'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold',
                'bg-gradient-to-r from-gold-500 to-gold-600 text-black',
                'hover:shadow-lg hover:shadow-gold-500/20 transition-all'
              )}
            >
              View Leagues
            </Link>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold',
                'bg-neutral-800 text-white hover:bg-neutral-700 transition-colors'
              )}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {teamsByLeague.map(([leagueId, { name, teams: leagueTeams }]) => (
            <div key={leagueId}>
              {/* League Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {name}
                  <span className="text-sm font-normal text-neutral-500">
                    ({leagueTeams.length} teams)
                  </span>
                </h2>
                <Link
                  href={`/dashboard/leagues/${leagueId}/teams/new`}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg',
                    'text-gold-500 hover:text-gold-400 hover:bg-gold-500/10 transition-colors'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Add Team
                </Link>
              </div>

              {/* Teams Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {leagueTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    leagueId={leagueId}
                    showLeague={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
