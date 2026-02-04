'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { createClient } from '@/lib/supabase/client';
import {
  getTeammates,
  saveTeammates,
  isCacheValid,
  type Teammate,
} from '@/lib/offline/db';
import { PlayerRow, PositionHeader } from '@/components/team/PlayerRow';
import { ListSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';

const POSITION_ORDER = ['Forward', 'Defense', 'Goalie', 'Unknown'];

export default function TeamPage() {
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [teamName, setTeamName] = useState('My Team');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTeammates = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = await getTeammates();
        if (cached.length > 0) {
          setTeammates(cached);
        }

        const cacheValid = await isCacheValid('teammates');
        if (cacheValid && cached.length > 0) {
          setIsLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get player's team
      const { data: rosterData } = await supabase
        .from('team_rosters')
        .select(`
          team_id,
          teams(id, name)
        `)
        .eq('player_id', user.id)
        .eq('status', 'active')
        .single();

      if (rosterData?.teams) {
        const team = rosterData.teams as any;
        setTeamName(team.name);

        // Fetch all teammates
        const { data: rosterMembers } = await supabase
          .from('team_rosters')
          .select(`
            id,
            team_id,
            player_id,
            jersey_number,
            position,
            leadership_role,
            profiles(id, full_name, email, avatar_url, phone)
          `)
          .eq('team_id', team.id)
          .eq('status', 'active');

        if (rosterMembers && rosterMembers.length > 0) {
          const fetchedTeammates: Teammate[] = rosterMembers.map((member: any) => ({
            id: member.id,
            team_id: member.team_id,
            player_id: member.player_id,
            full_name: member.profiles?.full_name || 'Unknown Player',
            jersey_number: member.jersey_number,
            position: member.position || 'Unknown',
            avatar_url: member.profiles?.avatar_url,
            phone: member.profiles?.phone,
            email: member.profiles?.email,
            is_captain: member.leadership_role === 'captain',
            updated_at: new Date().toISOString(),
          }));

          await saveTeammates(fetchedTeammates);
          setTeammates(fetchedTeammates);
        }
      }
    } catch (error) {
      console.error('Error loading teammates:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTeammates();
  }, [loadTeammates]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTeammates(true);
  };

  // Filter by search query
  const filteredTeammates = useMemo(() => {
    if (!searchQuery.trim()) return teammates;
    const query = searchQuery.toLowerCase();
    return teammates.filter(
      (t) =>
        t.full_name.toLowerCase().includes(query) ||
        t.position?.toLowerCase().includes(query) ||
        t.jersey_number?.toString().includes(query)
    );
  }, [teammates, searchQuery]);

  // Group by position
  const groupedByPosition = useMemo(() => {
    const groups: Record<string, Teammate[]> = {};

    filteredTeammates.forEach((teammate) => {
      const position = teammate.position || 'Unknown';
      if (!groups[position]) groups[position] = [];
      groups[position].push(teammate);
    });

    // Sort groups by position order
    return POSITION_ORDER.filter((pos) => groups[pos]?.length > 0).map((pos) => ({
      position: pos,
      players: groups[pos].sort((a, b) => {
        // Captain first, then by jersey number
        if (a.is_captain && !b.is_captain) return -1;
        if (!a.is_captain && b.is_captain) return 1;
        return (a.jersey_number || 99) - (b.jersey_number || 99);
      }),
    }));
  }, [filteredTeammates]);

  return (
    <div className="px-4 pt-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between py-4 bg-neutral-950/95 backdrop-blur-lg -mx-4 px-4 border-b border-gold-500/20">
        <div>
          <h1 className="text-xl font-bold text-white">Team</h1>
          <p className="text-sm text-neutral-500">{teamName}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            'p-2 rounded-full bg-neutral-850 border border-gold-500/20',
            'active:scale-95 transition-all',
            isRefreshing && 'opacity-50'
          )}
        >
          <RefreshCw
            className={cn('w-5 h-5 text-gold-500', isRefreshing && 'animate-spin')}
          />
        </button>
      </header>

      {/* Search */}
      <div className="py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search teammates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full h-10 pl-10 pr-4 rounded-lg',
              'bg-neutral-850 border border-gold-500/20 text-white',
              'placeholder:text-neutral-500',
              'focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent'
            )}
          />
        </div>
      </div>

      {/* Roster List */}
      <div className="pb-8">
        {isLoading ? (
          <ListSkeleton count={8} />
        ) : teammates.length === 0 ? (
          <EmptyState type="team" />
        ) : filteredTeammates.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-neutral-400">No teammates match your search</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByPosition.map((group) => (
              <div key={group.position}>
                <PositionHeader
                  position={group.position}
                  count={group.players.length}
                />
                <div className="space-y-3 mt-3">
                  {group.players.map((player) => (
                    <PlayerRow key={player.id} player={player} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
