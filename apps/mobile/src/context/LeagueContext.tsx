import * as SecureStore from 'expo-secure-store';
import { registerForPushNotifications } from '../lib/notifications';
import React from 'react';

import { supabase } from '../lib/supabase/client';
import { getDivisions, type Division } from '../lib/supabase/data';
import { getUserLeagues, type LeagueRow } from '../lib/supabase/leagues';
import { BLH_THEME, type LeagueTheme } from '../theme/LeagueTheme';

export type League = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  theme: LeagueTheme;
  city: string | null;
};

export type { Division };

const PERSIST_KEY = 'blh_active_league_id';

type LeagueContextValue = {
  activeLeague: League | null;
  activeTheme: LeagueTheme;
  availableLeagues: League[];
  isLoading: boolean;
  setActiveLeague: (league: League | null) => void;
  previewLeague: (league: League) => void;
  isGuestLeague: boolean;
  activeDivision: Division | null;
  setActiveDivision: (division: Division | null) => void;
  divisions: Division[];
};

function rowToLeague(row: LeagueRow): League {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    city: row.city,
    theme: {
      ...BLH_THEME,
      primaryColor: row.primary_color ?? '#22D3EE',
      secondaryColor: row.secondary_color ?? '#3B82F6',
      logoUrl: row.logo_url,
      leagueName: row.name,
    },
  };
}

const LeagueContext = React.createContext<LeagueContextValue | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [activeLeague, _setActiveLeague] = React.useState<League | null>(null);
  const [availableLeagues, setAvailableLeagues] = React.useState<League[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeDivision, setActiveDivision] = React.useState<Division | null>(null);
  const [divisions, setDivisions] = React.useState<Division[]>([]);
  const [isGuestLeague, setIsGuestLeague] = React.useState(false);

  // Load divisions whenever activeLeague changes; default to first division
  React.useEffect(() => {
    if (!activeLeague) {
      setDivisions([]);
      setActiveDivision(null);
      return;
    }
    getDivisions(activeLeague.id)
      .then((divs) => {
        setDivisions(divs);
        setActiveDivision(null);
      })
      .catch(() => {
        setDivisions([]);
        setActiveDivision(null);
      });
  }, [activeLeague?.id]);

  const setActiveLeague = React.useCallback(async (league: League | null) => {
    _setActiveLeague(league);
    setIsGuestLeague(false);
    if (league) {
      await SecureStore.setItemAsync(PERSIST_KEY, league.id).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(PERSIST_KEY).catch(() => {});
    }
  }, []);

  const previewLeague = React.useCallback((league: League) => {
    _setActiveLeague(league);
    setIsGuestLeague(true);
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoading(true);
        getUserLeagues()
          .then(async (rows) => {
            const leagues = rows.map(rowToLeague);
            setAvailableLeagues(leagues);
            // Restore persisted league
            try {
              const savedId = await SecureStore.getItemAsync(PERSIST_KEY);
              if (savedId) {
                const found = leagues.find((l) => l.id === savedId);
                if (found) _setActiveLeague(found);
              }
            } catch {}
          })
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        registerForPushNotifications().catch(() => {});
        setIsLoading(true);
        getUserLeagues()
          .then(async (rows) => {
            const leagues = rows.map(rowToLeague);
            setAvailableLeagues(leagues);
            try {
              const savedId = await SecureStore.getItemAsync(PERSIST_KEY);
              if (savedId) {
                const found = leagues.find((l) => l.id === savedId);
                if (found) _setActiveLeague(found);
              }
            } catch {}
          })
          .finally(() => setIsLoading(false));
      } else if (event === 'SIGNED_OUT') {
        setAvailableLeagues([]);
        _setActiveLeague(null);
        setIsGuestLeague(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = React.useMemo<LeagueContextValue>(
    () => ({
      activeLeague,
      activeTheme: activeLeague?.theme ?? BLH_THEME,
      availableLeagues,
      isLoading,
      setActiveLeague,
      previewLeague,
      isGuestLeague,
      activeDivision,
      setActiveDivision,
      divisions,
    }),
    [activeLeague, availableLeagues, isLoading, setActiveLeague, previewLeague, isGuestLeague, activeDivision, divisions],
  );

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const context = React.useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}
