// React hooks for scorekeeper sync functionality

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSyncService } from './sync-service';
import type { SyncState, GameEvent, Game, Player } from './types';
import {
  getGame,
  getTeamPlayers,
  getGameEvents,
  getGameEventsByPeriod,
} from './indexed-db';

/**
 * Hook to access sync state and subscribe to updates
 */
export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
  });

  useEffect(() => {
    const syncService = getSyncService();
    const unsubscribe = syncService.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
}

/**
 * Hook to manage a game session with realtime sync
 */
export function useGameSession(gameId: string | null) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [homeRoster, setHomeRoster] = useState<Player[]>([]);
  const [awayRoster, setAwayRoster] = useState<Player[]>([]);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (!gameId) {
      setIsLoading(false);
      return;
    }

    const syncService = getSyncService();

    async function initSession() {
      if (sessionStartedRef.current || !gameId) return;
      sessionStartedRef.current = true;

      try {
        setIsLoading(true);
        setError(null);

        // Start the session (loads data and subscribes to realtime)
        await syncService.startGameSession(gameId);

        // Load cached data from IndexedDB
        const gameData = await getGame(gameId);
        if (gameData) {
          setGame(gameData);

          // Load rosters
          const home = await getTeamPlayers(gameData.home_team_id);
          const away = await getTeamPlayers(gameData.away_team_id);
          setHomeRoster(home);
          setAwayRoster(away);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setIsLoading(false);
      }
    }

    initSession();

    return () => {
      sessionStartedRef.current = false;
      syncService.endGameSession();
    };
  }, [gameId]);

  const refresh = useCallback(async () => {
    if (!gameId) return;

    const syncService = getSyncService();
    await syncService.forceSync();

    const gameData = await getGame(gameId);
    if (gameData) {
      setGame(gameData);
      const home = await getTeamPlayers(gameData.home_team_id);
      const away = await getTeamPlayers(gameData.away_team_id);
      setHomeRoster(home);
      setAwayRoster(away);
    }
  }, [gameId]);

  return {
    isLoading,
    error,
    game,
    homeRoster,
    awayRoster,
    refresh,
  };
}

/**
 * Hook to manage game events with offline support
 */
export function useGameEvents(gameId: string | null) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!gameId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const allEvents = await getGameEvents(gameId);
    setEvents(allEvents);
    setIsLoading(false);
  }, [gameId]);

  useEffect(() => {
    loadEvents(); // eslint-disable-line -- data-fetching with polling for IndexedDB changes

    // Set up polling for local changes (IndexedDB doesn't have native observers)
    const interval = setInterval(loadEvents, 1000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const createEvent = useCallback(
    async (
      eventData: Omit<
        GameEvent,
        | 'id'
        | 'client_event_id'
        | 'event_version'
        | 'sync_status'
        | 'created_offline'
        | 'created_at'
        | 'updated_at'
        | 'game_id'
      >
    ) => {
      if (!gameId) throw new Error('No game ID');

      const syncService = getSyncService();
      const event = await syncService.createEvent({
        ...eventData,
        game_id: gameId,
      });

      // Optimistically update local state
      setEvents((prev) => [...prev, event].sort((a, b) => {
        if (a.period !== b.period) return a.period - b.period;
        return a.game_time_seconds - b.game_time_seconds;
      }));

      return event;
    },
    [gameId]
  );

  const undoEvent = useCallback(
    async (eventId: string) => {
      const syncService = getSyncService();
      await syncService.undoEvent(eventId);

      // Optimistically update local state
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    },
    []
  );

  return {
    events,
    isLoading,
    createEvent,
    undoEvent,
    refresh: loadEvents,
  };
}

/**
 * Hook to get events for a specific period
 */
export function usePeriodEvents(gameId: string | null, period: number) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!gameId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const periodEvents = await getGameEventsByPeriod(gameId, period);
    setEvents(periodEvents);
    setIsLoading(false);
  }, [gameId, period]);

  useEffect(() => {
    loadEvents(); // eslint-disable-line -- data-fetching with polling for period events
    const interval = setInterval(loadEvents, 1000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  return { events, isLoading, refresh: loadEvents };
}

/**
 * Hook to calculate game score from events
 */
export function useGameScore(gameId: string | null) {
  const { events } = useGameEvents(gameId);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!gameId) return;
    getGame(gameId).then((g) => setGame(g ?? null));
  }, [gameId]);

  const score = {
    home: events.filter(
      (e) => e.event_type === 'goal' && e.team_id === game?.home_team_id && !e.deleted_at
    ).length,
    away: events.filter(
      (e) => e.event_type === 'goal' && e.team_id === game?.away_team_id && !e.deleted_at
    ).length,
  };

  return score;
}

/**
 * Hook for player search by jersey number
 */
export function usePlayerSearch(teamId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!teamId) {
      setPlayers([]); // eslint-disable-line -- reset players when teamId is null
      return;
    }

    getTeamPlayers(teamId).then(setPlayers);
  }, [teamId]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredPlayers(players); // eslint-disable-line -- sync filtered list when search clears
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = players.filter(
      (p) =>
        p.jersey_number.toString().includes(term) ||
        p.full_name.toLowerCase().includes(term)
    );

    // Sort by jersey number match first, then name match
    filtered.sort((a, b) => {
      const aJerseyMatch = a.jersey_number.toString().startsWith(term);
      const bJerseyMatch = b.jersey_number.toString().startsWith(term);
      if (aJerseyMatch && !bJerseyMatch) return -1;
      if (!aJerseyMatch && bJerseyMatch) return 1;
      return a.jersey_number - b.jersey_number;
    });

    setFilteredPlayers(filtered);
  }, [searchTerm, players]);

  return {
    players: filteredPlayers,
    allPlayers: players,
    searchTerm,
    setSearchTerm,
  };
}
