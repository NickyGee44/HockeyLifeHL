/**
 * IndexedDB Offline Data Layer
 * Provides offline-first data caching for player companion app
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema interfaces
interface PlayerProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  jersey_number?: number;
  position?: string;
  team_id?: string;
  team_name?: string;
  league_id?: string;
  updated_at: string;
}

interface Game {
  id: string;
  league_id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  venue?: string;
  rink?: string;
  home_score?: number;
  away_score?: number;
  is_home: boolean;
  updated_at: string;
}

interface PlayerStats {
  id: string;
  player_id: string;
  season_id: string;
  league_id: string;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  penalty_minutes: number;
  plus_minus: number | null;
  updated_at: string;
}

interface GameStat {
  id: string;
  game_id: string;
  player_id: string;
  goals: number;
  assists: number;
  points: number;
  penalty_minutes: number;
  game_date: string;
  opponent: string;
  result: 'W' | 'L' | 'T' | 'OTL';
}

interface Teammate {
  id: string;
  team_id: string;
  player_id: string;
  full_name: string;
  jersey_number?: number;
  position?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  is_captain: boolean;
  updated_at: string;
}

interface NotificationSettings {
  id: string;
  player_id: string;
  game_reminders: boolean;
  score_updates: boolean;
  schedule_changes: boolean;
  push_subscription?: string;
  updated_at: string;
}

interface CacheMetadata {
  key: string;
  last_synced: string;
  expires_at: string;
}

// IndexedDB Schema
interface PlayerCompanionDB extends DBSchema {
  profile: {
    key: string;
    value: PlayerProfile;
  };
  games: {
    key: string;
    value: Game;
    indexes: {
      'by-scheduled': string;
      'by-league': string;
      'by-status': string;
    };
  };
  stats: {
    key: string;
    value: PlayerStats;
    indexes: {
      'by-season': string;
      'by-league': string;
    };
  };
  game_stats: {
    key: string;
    value: GameStat;
    indexes: {
      'by-game': string;
      'by-date': string;
    };
  };
  teammates: {
    key: string;
    value: Teammate;
    indexes: {
      'by-team': string;
      'by-position': string;
    };
  };
  notification_settings: {
    key: string;
    value: NotificationSettings;
  };
  cache_metadata: {
    key: string;
    value: CacheMetadata;
  };
}

const DB_NAME = 'player-companion';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PlayerCompanionDB> | null = null;

/**
 * Initialize and get database instance
 */
export async function getDB(): Promise<IDBPDatabase<PlayerCompanionDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PlayerCompanionDB>(DB_NAME, DB_VERSION, {
    upgrade(db: IDBPDatabase<PlayerCompanionDB>) {
      // Profile store
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }

      // Games store with indexes
      if (!db.objectStoreNames.contains('games')) {
        const gamesStore = db.createObjectStore('games', { keyPath: 'id' });
        gamesStore.createIndex('by-scheduled', 'scheduled_at');
        gamesStore.createIndex('by-league', 'league_id');
        gamesStore.createIndex('by-status', 'status');
      }

      // Stats store with indexes
      if (!db.objectStoreNames.contains('stats')) {
        const statsStore = db.createObjectStore('stats', { keyPath: 'id' });
        statsStore.createIndex('by-season', 'season_id');
        statsStore.createIndex('by-league', 'league_id');
      }

      // Game stats store
      if (!db.objectStoreNames.contains('game_stats')) {
        const gameStatsStore = db.createObjectStore('game_stats', { keyPath: 'id' });
        gameStatsStore.createIndex('by-game', 'game_id');
        gameStatsStore.createIndex('by-date', 'game_date');
      }

      // Teammates store
      if (!db.objectStoreNames.contains('teammates')) {
        const teammatesStore = db.createObjectStore('teammates', { keyPath: 'id' });
        teammatesStore.createIndex('by-team', 'team_id');
        teammatesStore.createIndex('by-position', 'position');
      }

      // Notification settings store
      if (!db.objectStoreNames.contains('notification_settings')) {
        db.createObjectStore('notification_settings', { keyPath: 'id' });
      }

      // Cache metadata store
      if (!db.objectStoreNames.contains('cache_metadata')) {
        db.createObjectStore('cache_metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ============= Profile Operations =============

export async function saveProfile(profile: PlayerProfile): Promise<void> {
  const db = await getDB();
  await db.put('profile', { ...profile, updated_at: new Date().toISOString() });
  await updateCacheMetadata('profile', 24 * 60 * 60 * 1000); // 24 hours
}

export async function getProfile(): Promise<PlayerProfile | undefined> {
  const db = await getDB();
  const profiles = await db.getAll('profile');
  return profiles[0];
}

// ============= Games Operations =============

export async function saveGames(games: Game[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('games', 'readwrite');
  await Promise.all([
    ...games.map((game) => tx.store.put({ ...game, updated_at: new Date().toISOString() })),
    tx.done,
  ]);
  await updateCacheMetadata('games', 5 * 60 * 1000); // 5 minutes
}

export async function getUpcomingGames(limit = 10): Promise<Game[]> {
  const db = await getDB();
  const now = new Date().toISOString();
  const games = await db.getAllFromIndex('games', 'by-scheduled');
  return games
    .filter((g: Game) => g.scheduled_at >= now && g.status === 'scheduled')
    .slice(0, limit);
}

export async function getRecentGames(limit = 10): Promise<Game[]> {
  const db = await getDB();
  const games = await db.getAllFromIndex('games', 'by-scheduled');
  return games
    .filter((g: Game) => g.status === 'completed')
    .sort((a: Game, b: Game) => b.scheduled_at.localeCompare(a.scheduled_at))
    .slice(0, limit);
}

export async function getNextGame(): Promise<Game | undefined> {
  const upcoming = await getUpcomingGames(1);
  return upcoming[0];
}

// ============= Stats Operations =============

export async function saveStats(stats: PlayerStats): Promise<void> {
  const db = await getDB();
  await db.put('stats', { ...stats, updated_at: new Date().toISOString() });
  await updateCacheMetadata('stats', 15 * 60 * 1000); // 15 minutes
}

export async function getStats(seasonId?: string): Promise<PlayerStats | undefined> {
  const db = await getDB();
  if (seasonId) {
    const allStats = await db.getAllFromIndex('stats', 'by-season', seasonId);
    return allStats[0];
  }
  const allStats = await db.getAll('stats');
  return allStats.sort((a: PlayerStats, b: PlayerStats) => b.updated_at.localeCompare(a.updated_at))[0];
}

// ============= Game Stats Operations =============

export async function saveGameStats(gameStats: GameStat[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('game_stats', 'readwrite');
  await Promise.all([
    ...gameStats.map((stat) => tx.store.put(stat)),
    tx.done,
  ]);
  await updateCacheMetadata('game_stats', 15 * 60 * 1000);
}

export async function getGameLog(limit = 20): Promise<GameStat[]> {
  const db = await getDB();
  const stats = await db.getAllFromIndex('game_stats', 'by-date');
  return stats.sort((a: GameStat, b: GameStat) => b.game_date.localeCompare(a.game_date)).slice(0, limit);
}

// ============= Teammates Operations =============

export async function saveTeammates(teammates: Teammate[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('teammates', 'readwrite');
  await Promise.all([
    ...teammates.map((teammate) =>
      tx.store.put({ ...teammate, updated_at: new Date().toISOString() })
    ),
    tx.done,
  ]);
  await updateCacheMetadata('teammates', 60 * 60 * 1000); // 1 hour
}

export async function getTeammates(teamId?: string): Promise<Teammate[]> {
  const db = await getDB();
  if (teamId) {
    return db.getAllFromIndex('teammates', 'by-team', teamId);
  }
  return db.getAll('teammates');
}

export async function getTeammatesByPosition(): Promise<Record<string, Teammate[]>> {
  const teammates = await getTeammates();
  return teammates.reduce(
    (acc, teammate) => {
      const position = teammate.position || 'Unknown';
      if (!acc[position]) acc[position] = [];
      acc[position].push(teammate);
      return acc;
    },
    {} as Record<string, Teammate[]>
  );
}

// ============= Notification Settings =============

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  const db = await getDB();
  await db.put('notification_settings', { ...settings, updated_at: new Date().toISOString() });
}

export async function getNotificationSettings(): Promise<NotificationSettings | undefined> {
  const db = await getDB();
  const settings = await db.getAll('notification_settings');
  return settings[0];
}

// ============= Cache Management =============

async function updateCacheMetadata(key: string, ttlMs: number): Promise<void> {
  const db = await getDB();
  const now = new Date();
  await db.put('cache_metadata', {
    key,
    last_synced: now.toISOString(),
    expires_at: new Date(now.getTime() + ttlMs).toISOString(),
  });
}

export async function isCacheValid(key: string): Promise<boolean> {
  const db = await getDB();
  const metadata = await db.get('cache_metadata', key);
  if (!metadata) return false;
  return new Date(metadata.expires_at) > new Date();
}

export async function getCacheTimestamp(key: string): Promise<Date | null> {
  const db = await getDB();
  const metadata = await db.get('cache_metadata', key);
  return metadata ? new Date(metadata.last_synced) : null;
}

export async function clearAllCache(): Promise<void> {
  const db = await getDB();
  const stores = ['profile', 'games', 'stats', 'game_stats', 'teammates', 'cache_metadata'] as const;
  for (const store of stores) {
    await db.clear(store);
  }
}

// Export types
export type {
  PlayerProfile,
  Game,
  PlayerStats,
  GameStat,
  Teammate,
  NotificationSettings,
};
