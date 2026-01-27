"use server";

import { createClient } from "@/lib/supabase/server";

export type PublicLeague = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_color: string | null;
  secondary_color: string | null;
  website_url: string | null;
  contact_email: string | null;
  registration_url: string | null;
  search_keywords: string[] | null;
  address: string | null;
  postal_code: string | null;
  distance_km?: number;
  sport?: string;
  created_at?: string;
};

export type PublicLeaguesResult = {
  leagues: PublicLeague[];
  total: number;
  error?: string;
};

export type LeagueProfileResult = {
  league?: PublicLeague & {
    teams?: Array<{ id: string; name: string }>;
    upcomingGames?: Array<any>;
    stats?: {
      teams: number;
      upcomingGames: number;
    };
  };
  error?: string;
};

/**
 * Get public leagues with optional filtering
 *
 * Supports:
 * - Keyword search (searches name, description, city, keywords)
 * - Location-based search (lat/lon with radius)
 * - Sport filter
 * - Pagination
 *
 * No authentication required - this is for public discovery
 */
export async function getPublicLeagues(filters?: {
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  sport?: string;
  limit?: number;
  offset?: number;
}): Promise<PublicLeaguesResult> {
  try {
    const supabase = await createClient();

    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    // ============================================================================
    // LOCATION-BASED SEARCH (if lat/lon provided)
    // ============================================================================

    if (filters?.latitude && filters?.longitude) {
      const radius = filters.radius_km || 50; // Default 50km radius

      // Use the search_nearby_leagues stored procedure
      const { data: nearbyLeagues, error } = await (supabase as any)
        .rpc('search_nearby_leagues', {
          user_lat: filters.latitude,
          user_lon: filters.longitude,
          radius_km: radius,
        });

      if (error) {
        console.error('Error searching nearby leagues:', error);
        return { error: 'Failed to search nearby leagues', leagues: [], total: 0 };
      }

      // Get league IDs to fetch full data
      const leagueIds = (nearbyLeagues || []).map((l: any) => l.id);

      if (leagueIds.length === 0) {
        return { leagues: [], total: 0 };
      }

      // Fetch full league data
      let query = supabase
        .from('leagues')
        .select('*')
        .in('id', leagueIds)
        .eq('is_public', true)
        .eq('status', 'active');

      // Apply sport filter if provided
      if (filters.sport) {
        query = query.ilike('sport', `%${filters.sport}%`);
      }

      const { data: fullLeagues, error: fullError } = await query;

      if (fullError) {
        console.error('Error fetching full league data:', fullError);
        return { error: 'Failed to fetch league details', leagues: [], total: 0 };
      }

      // Merge distance data with full league data
      const leaguesWithDistance = (fullLeagues || []).map((league: any) => {
        const nearbyData = nearbyLeagues.find((l: any) => l.id === league.id);
        return {
          ...league,
          distance_km: nearbyData?.distance_km || null,
        };
      });

      // Sort by distance
      leaguesWithDistance.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));

      // Apply pagination
      const paginatedLeagues = leaguesWithDistance.slice(offset, offset + limit);

      return {
        leagues: paginatedLeagues,
        total: leaguesWithDistance.length,
      };
    }

    // ============================================================================
    // KEYWORD SEARCH (if keyword provided)
    // ============================================================================

    if (filters?.keyword && filters.keyword.trim().length > 0) {
      const keyword = filters.keyword.trim();

      // Use the search_leagues_by_keyword stored procedure
      const { data: searchResults, error } = await (supabase as any)
        .rpc('search_leagues_by_keyword', {
          search_query: keyword,
          limit_results: 100, // Get many results for filtering
        });

      if (error) {
        console.error('Error searching leagues by keyword:', error);
        return { error: 'Failed to search leagues', leagues: [], total: 0 };
      }

      // Get league IDs from search results
      const leagueIds = (searchResults || []).map((l: any) => l.id);

      if (leagueIds.length === 0) {
        return { leagues: [], total: 0 };
      }

      // Fetch full league data
      let query = supabase
        .from('leagues')
        .select('*')
        .in('id', leagueIds)
        .eq('is_public', true)
        .eq('status', 'active');

      // Apply sport filter if provided
      if (filters.sport) {
        query = query.ilike('sport', `%${filters.sport}%`);
      }

      const { data: fullLeagues, error: fullError } = await query;

      if (fullError) {
        console.error('Error fetching full league data:', fullError);
        return { error: 'Failed to fetch league details', leagues: [], total: 0 };
      }

      // Sort by relevance from search results
      const leagueRelevance = new Map(
        (searchResults || []).map((l: any) => [l.id, l.relevance])
      );

      const sortedLeagues = (fullLeagues || []).sort((a: any, b: any) => {
        const relevanceA: number = leagueRelevance.get(a.id) || 0;
        const relevanceB: number = leagueRelevance.get(b.id) || 0;
        return relevanceB - relevanceA; // Higher relevance first
      });

      // Apply pagination
      const paginatedResults = sortedLeagues.slice(offset, offset + limit);

      return {
        leagues: paginatedResults,
        total: sortedLeagues.length,
      };
    }

    // ============================================================================
    // GENERAL BROWSE (no search filters)
    // ============================================================================

    let query = supabase
      .from('leagues')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .eq('status', 'active');

    // Apply sport filter if provided
    if (filters?.sport) {
      query = query.ilike('sport', `%${filters.sport}%`);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: leagues, error, count } = await query;

    if (error) {
      console.error('Error fetching public leagues:', error);
      return { error: 'Failed to fetch leagues', leagues: [], total: 0 };
    }

    return {
      leagues: leagues || [],
      total: count || 0,
    };
  } catch (error: any) {
    console.error('Unexpected error in getPublicLeagues:', error);
    return {
      error: error.message || 'An unexpected error occurred',
      leagues: [],
      total: 0,
    };
  }
}

/**
 * Get public profile for a specific league by slug
 *
 * Returns:
 * - League details
 * - Public team names (no rosters)
 * - Upcoming games (next 5)
 *
 * No authentication required
 */
export async function getLeaguePublicProfile(slug: string): Promise<LeagueProfileResult> {
  try {
    const supabase = await createClient();

    // ============================================================================
    // 1. GET LEAGUE BY SLUG
    // ============================================================================

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('slug', slug)
      .eq('is_public', true)
      .eq('status', 'active')
      .single();

    if (leagueError || !league) {
      return { error: 'League not found or not publicly visible' };
    }

    // ============================================================================
    // 2. GET PUBLIC TEAMS (names only, no rosters)
    // ============================================================================

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, logo_url')
      .eq('league_id', league.id)
      .order('name', { ascending: true });

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
    }

    // ============================================================================
    // 3. GET UPCOMING GAMES (next 5)
    // ============================================================================

    const now = new Date().toISOString();

    const { data: upcomingGames, error: gamesError } = await supabase
      .from('games')
      .select(`
        id,
        scheduled_at,
        location,
        status,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name)
      `)
      .eq('league_id', league.id)
      .gte('scheduled_at', now)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (gamesError) {
      console.error('Error fetching upcoming games:', gamesError);
    }

    // ============================================================================
    // 4. BUILD RESPONSE
    // ============================================================================

    return {
      league: {
        ...league,
        teams: teams || [],
        upcomingGames: upcomingGames || [],
        stats: {
          teams: teams?.length || 0,
          upcomingGames: upcomingGames?.length || 0,
        },
      },
    };
  } catch (error: any) {
    console.error('Unexpected error in getLeaguePublicProfile:', error);
    return {
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Get leagues by location (city, state, country)
 * Uses the database helper function for optimized queries
 */
export async function getLeaguesByLocation(filters: {
  city?: string;
  state?: string;
  country?: string;
  limit?: number;
  offset?: number;
}): Promise<PublicLeaguesResult> {
  try {
    const supabase = await createClient();

    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    // Use the database helper function to get league IDs
    const { data: locationResults, error } = await (supabase as any)
      .rpc('get_leagues_by_location', {
        search_city: filters.city || null,
        search_state: filters.state || null,
        search_country: filters.country || 'USA',
      });

    if (error) {
      console.error('Error searching leagues by location:', error);
      return { error: 'Failed to search leagues by location', leagues: [], total: 0 };
    }

    // Get league IDs
    const leagueIds = (locationResults || []).map((l: any) => l.id);

    if (leagueIds.length === 0) {
      return { leagues: [], total: 0 };
    }

    // Fetch full league data
    const { data: fullLeagues, error: fullError } = await supabase
      .from('leagues')
      .select('*')
      .in('id', leagueIds)
      .eq('is_public', true)
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (fullError) {
      console.error('Error fetching full league data:', fullError);
      return { error: 'Failed to fetch league details', leagues: [], total: 0 };
    }

    // Apply pagination
    const total = fullLeagues?.length || 0;
    const paginatedLeagues = (fullLeagues || []).slice(offset, offset + limit);

    return {
      leagues: paginatedLeagues,
      total,
    };
  } catch (error: any) {
    console.error('Unexpected error in getLeaguesByLocation:', error);
    return {
      error: error.message || 'An unexpected error occurred',
      leagues: [],
      total: 0,
    };
  }
}
