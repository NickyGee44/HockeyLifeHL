'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { pickOperationalSeason } from '@/lib/seasons/operational';

interface League {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string;
  is_public: boolean;
  current_season_id: string | null; // Computed from the operational season
  settings: Record<string, unknown> | null;
}

interface UseLeagueReturn {
  league: League | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to get current league data based on URL slug
 */
export function useLeague(): UseLeagueReturn {
  const params = useParams();
  const leagueSlug = params.leagueSlug as string;

  const [league, setLeague] = useState<League | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLeague = async () => {
      if (!leagueSlug) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('leagues')
          .select(`
            id,
            name,
            slug,
            description,
            logo_url,
            banner_url,
            primary_color,
            secondary_color,
            status,
            is_public,
            settings
          `)
          .eq('slug', leagueSlug)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        // Fetch current operational season
        let currentSeasonId: string | null = null;
        if (data) {
          const { data: seasonData } = await supabase
            .from('seasons')
            .select('id, status, start_date, end_date, created_at')
            .eq('league_id', data.id)
            .order('start_date', { ascending: false })
            .order('created_at', { ascending: false });

          currentSeasonId = pickOperationalSeason(seasonData || [])?.id || null;
        }

        setLeague({ ...data, settings: (data.settings as Record<string, unknown> | null) ?? null, current_season_id: currentSeasonId });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch league'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeague();
  }, [leagueSlug]);

  return { league, isLoading, error };
}
