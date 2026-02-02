// Sync Service for PWA Scorekeeper
// Handles bidirectional sync between IndexedDB and Supabase
// Uses server-wins conflict resolution strategy

import { createClient } from '@/lib/supabase/client';
import {
  GameEvent,
  Game,
  Player,
  Team,
  SyncState,
  generateClientEventId,
} from './types';
import {
  saveGameEvent,
  getGameEvent,
  getGameEvents,
  getPendingEvents,
  updateEventSyncStatus,
  saveGame,
  savePlayers,
  saveTeam,
  getGameEventByClientId,
} from './indexed-db';
import type { RealtimeChannel } from '@supabase/supabase-js';

type SyncCallback = (state: SyncState) => void;

class ScorekeeperSyncService {
  private supabase = createClient();
  private channel: RealtimeChannel | null = null;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncState: SyncState = {
    isOnline: this.isOnline,
    isSyncing: false,
    pendingCount: 0,
  };
  private listeners: Set<SyncCallback> = new Set();
  private syncInProgress = false;
  private currentGameId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  // ============= State Management =============

  private updateState(partial: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...partial };
    this.listeners.forEach(cb => cb(this.syncState));
  }

  subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    callback(this.syncState);
    return () => this.listeners.delete(callback);
  }

  getState(): SyncState {
    return this.syncState;
  }

  // ============= Network Handlers =============

  private handleOnline = async (): Promise<void> => {
    this.isOnline = true;
    this.updateState({ isOnline: true });
    // Trigger sync when coming back online
    await this.syncPendingEvents();
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    this.updateState({ isOnline: false });
  };

  // ============= Game Session Management =============

  async startGameSession(gameId: string): Promise<void> {
    this.currentGameId = gameId;

    // Load game data from server
    await this.loadGameData(gameId);

    // Subscribe to realtime updates
    await this.subscribeToGame(gameId);

    // Sync any pending events
    if (this.isOnline) {
      await this.syncPendingEvents();
    }
  }

  async endGameSession(): Promise<void> {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.currentGameId = null;
  }

  // ============= Data Loading =============

  private async loadGameData(gameId: string): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Fetch game with teams
      const { data: game, error: gameError } = await this.supabase
        .from('games')
        .select(`
          *,
          home_team:teams!games_home_team_id_fkey(*),
          away_team:teams!games_away_team_id_fkey(*)
        `)
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      // Save game and teams to IndexedDB
      if (game) {
        // Cast to any to handle varying database schemas
        const gameRecord = game as any;
        const gameData: Game = {
          id: gameRecord.id,
          home_team_id: gameRecord.home_team_id,
          away_team_id: gameRecord.away_team_id,
          home_team: gameRecord.home_team as Team,
          away_team: gameRecord.away_team as Team,
          scheduled_start: gameRecord.scheduled_at || gameRecord.scheduled_start,
          period_count: gameRecord.period_count ?? 3,
          period_length_minutes: gameRecord.period_length_minutes ?? 20,
          current_period: gameRecord.current_period ?? 0,
          game_status: gameRecord.status ?? 'scheduled',
        };

        await saveGame(gameData);

        if (gameRecord.home_team) await saveTeam(gameRecord.home_team as Team);
        if (gameRecord.away_team) await saveTeam(gameRecord.away_team as Team);
      }

      // Fetch rosters for both teams
      const gameRecord = game as any;
      await this.loadTeamRoster(gameRecord.home_team_id, gameId);
      await this.loadTeamRoster(gameRecord.away_team_id, gameId);

      // Fetch existing events from server
      await this.loadGameEvents(gameId);
    } catch (error) {
      console.error('Error loading game data:', error);
      this.updateState({ lastError: 'Failed to load game data' });
    }
  }

  private async loadTeamRoster(teamId: string, gameId: string): Promise<void> {
    try {
      // Get season from game
      const { data: game } = await this.supabase
        .from('games')
        .select('season_id')
        .eq('id', gameId)
        .single();

      if (!game?.season_id) return;

      // Get active roster for this season
      const { data: roster, error } = await this.supabase
        .from('team_rosters')
        .select(`
          player_id,
          jersey_number,
          position,
          profiles:player_id(id, full_name)
        `)
        .eq('team_id', teamId)
        .eq('season_id', game.season_id)
        .is('end_date', null)
        .eq('status', 'active');

      if (error) throw error;

      const players: Player[] = (roster || []).map((r: any) => ({
        id: r.player_id,
        full_name: r.profiles?.full_name || 'Unknown',
        jersey_number: r.jersey_number,
        position: r.position,
        team_id: teamId,
      }));

      await savePlayers(players);
    } catch (error) {
      console.error(`Error loading roster for team ${teamId}:`, error);
    }
  }

  private async loadGameEvents(gameId: string): Promise<void> {
    try {
      const { data: events, error } = await (this.supabase as any)
        .rpc('get_game_events_for_scorekeeper', { p_game_id: gameId });

      if (error) throw error;

      // Merge server events with local events using server-wins strategy
      for (const serverEvent of events || []) {
        const localEvent = await getGameEventByClientId(serverEvent.client_event_id);

        if (!localEvent) {
          // New event from server - save to IndexedDB
          const gameEvent: GameEvent = {
            ...serverEvent,
            sync_status: 'synced',
            created_offline: false,
          };
          await saveGameEvent(gameEvent);
        } else if (serverEvent.event_version > localEvent.event_version) {
          // Server has newer version - server wins
          const updatedEvent: GameEvent = {
            ...serverEvent,
            sync_status: 'synced',
          };
          await saveGameEvent(updatedEvent);
        }
        // If local version is equal or higher and status is 'synced', keep local
        // This handles the case where we just synced but haven't received the update yet
      }
    } catch (error) {
      console.error('Error loading game events:', error);
    }
  }

  // ============= Realtime Subscription =============

  private async subscribeToGame(gameId: string): Promise<void> {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
    }

    this.channel = this.supabase
      .channel(`game_events:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_events',
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          await this.handleRealtimeEvent(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to game events realtime');
        }
      });
  }

  private async handleRealtimeEvent(payload: any): Promise<void> {
    const serverEvent = payload.new as GameEvent;

    if (!serverEvent) return;

    // Check if this is our own event coming back
    const localEvent = await getGameEventByClientId(serverEvent.client_event_id);

    if (localEvent?.sync_status === 'syncing') {
      // This is our event being confirmed - mark as synced
      await updateEventSyncStatus(localEvent.id, 'synced', new Date().toISOString());
      await this.updatePendingCount();
      return;
    }

    // Server-wins: Always apply server changes for events we don't own
    if (!localEvent || serverEvent.event_version > localEvent.event_version) {
      const gameEvent: GameEvent = {
        ...serverEvent,
        sync_status: 'synced',
        created_offline: false,
      };
      await saveGameEvent(gameEvent);
    }
  }

  // ============= Event Creation =============

  async createEvent(
    eventData: Omit<GameEvent, 'id' | 'client_event_id' | 'event_version' | 'sync_status' | 'created_offline' | 'created_at' | 'updated_at'>
  ): Promise<GameEvent> {
    const now = new Date().toISOString();
    const clientEventId = generateClientEventId();

    const event: GameEvent = {
      id: crypto.randomUUID(),
      client_event_id: clientEventId,
      event_version: 1,
      sync_status: this.isOnline ? 'pending' : 'pending',
      created_offline: !this.isOnline,
      created_at: now,
      updated_at: now,
      ...eventData,
    };

    // Save to IndexedDB first (optimistic)
    await saveGameEvent(event);
    await this.updatePendingCount();

    // Attempt to sync if online
    if (this.isOnline) {
      this.syncEvent(event);
    }

    return event;
  }

  async undoEvent(eventId: string): Promise<void> {
    const event = await getGameEvent(eventId);
    if (!event) return;

    // Soft delete locally
    event.deleted_at = new Date().toISOString();
    event.sync_status = 'pending';
    event.event_version += 1;
    event.updated_at = new Date().toISOString();
    await saveGameEvent(event);
    await this.updatePendingCount();

    // Sync the deletion
    if (this.isOnline) {
      this.syncEvent(event);
    }
  }

  // ============= Sync Operations =============

  private async syncEvent(event: GameEvent): Promise<void> {
    try {
      await updateEventSyncStatus(event.id, 'syncing');

      const { error } = await (this.supabase as any)
        .rpc('sync_game_event', {
          p_client_event_id: event.client_event_id,
          p_event_version: event.event_version,
          p_game_id: event.game_id,
          p_team_id: event.team_id,
          p_player_id: event.player_id,
          p_event_type: event.event_type,
          p_period: event.period,
          p_game_time_seconds: event.game_time_seconds,
          p_assist_player_ids: event.assist_player_ids || null,
          p_penalty_type: event.penalty_type || null,
          p_penalty_minutes: event.penalty_minutes || null,
          p_penalty_description: event.penalty_description || null,
          p_deleted_at: event.deleted_at || null,
        });

      if (error) {
        throw error;
      }

      await updateEventSyncStatus(event.id, 'synced', new Date().toISOString());
      await this.updatePendingCount();
    } catch (error: any) {
      console.error('Error syncing event:', error);

      // Handle version conflict - server wins
      if (error.code === 'VERSION_CONFLICT') {
        await updateEventSyncStatus(event.id, 'conflict');
        // Reload the server version
        await this.loadGameEvents(event.game_id);
      } else {
        await updateEventSyncStatus(event.id, 'error');
      }

      this.updateState({ lastError: error.message });
    }
  }

  async syncPendingEvents(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    this.updateState({ isSyncing: true });

    try {
      const pendingEvents = await getPendingEvents();

      for (const event of pendingEvents) {
        await this.syncEvent(event);
      }

      this.updateState({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        lastError: undefined,
      });
    } catch (error: any) {
      console.error('Error syncing pending events:', error);
      this.updateState({
        isSyncing: false,
        lastError: error.message,
      });
    } finally {
      this.syncInProgress = false;
      await this.updatePendingCount();
    }
  }

  private async updatePendingCount(): Promise<void> {
    const pending = await getPendingEvents();
    this.updateState({ pendingCount: pending.length });
  }

  // ============= Utility Methods =============

  async getGameEventsFromLocal(gameId: string): Promise<GameEvent[]> {
    return getGameEvents(gameId);
  }

  async forceSync(): Promise<void> {
    if (this.isOnline && this.currentGameId) {
      await this.loadGameEvents(this.currentGameId);
      await this.syncPendingEvents();
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
    }
  }
}

// Singleton instance
let syncServiceInstance: ScorekeeperSyncService | null = null;

export function getSyncService(): ScorekeeperSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new ScorekeeperSyncService();
  }
  return syncServiceInstance;
}

export type { ScorekeeperSyncService };
