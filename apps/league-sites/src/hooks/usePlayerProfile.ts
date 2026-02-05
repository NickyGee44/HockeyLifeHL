'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useUser';

interface PlayerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface TeamMembership {
  id: string;
  team_id: string;
  team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    league_id: string;
    division_id: string | null;
  };
  jersey_number: number | null;
  position: string | null;
  leadership_role: 'captain' | 'alternate_captain' | null;
  is_captain: boolean; // computed from leadership_role
  is_alternate: boolean; // computed from leadership_role
}

interface UsePlayerProfileReturn {
  profile: PlayerProfile | null;
  teams: TeamMembership[];
  currentTeam: TeamMembership | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get current player's profile and team memberships
 * For the authenticated player on league sites
 */
export function usePlayerProfile(leagueId?: string): UsePlayerProfileReturn {
  const { user, isLoading: userLoading } = useUser();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setTeams([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      setProfile(profileData);

      // Fetch team memberships
      const { data: teamsData, error: teamsError } = await supabase
        .from('team_rosters')
        .select(`
          id,
          team_id,
          jersey_number,
          position,
          leadership_role,
          team:teams(id, name, slug, logo, league_id, division_id)
        `)
        .eq('player_id', user.id);

      if (teamsError) {
        throw new Error(teamsError.message);
      }

      // Transform the data - convert leadership_role enum to is_captain/is_alternate booleans
      const memberships: TeamMembership[] = (teamsData || []).map((item: any) => ({
        id: item.id,
        team_id: item.team_id,
        team: Array.isArray(item.team) ? item.team[0] : item.team,
        jersey_number: item.jersey_number,
        position: item.position,
        leadership_role: item.leadership_role,
        is_captain: item.leadership_role === 'captain',
        is_alternate: item.leadership_role === 'alternate_captain',
      }));

      setTeams(memberships);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading) {
      fetchProfile();
    }
  }, [user, userLoading]);

  // Get current team for this league
  const currentTeam = leagueId
    ? teams.find((t) => t.team?.league_id === leagueId) ?? null
    : teams[0] ?? null;

  return {
    profile,
    teams,
    currentTeam,
    isLoading: userLoading || isLoading,
    error,
    refetch: fetchProfile,
  };
}
