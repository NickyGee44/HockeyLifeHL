// IndexedDB wrapper for offline-first scorekeeper
// Provides type-safe access to local storage for game events

import {
  DB_NAME,
  DB_VERSION,
  STORES,
  GameEvent,
  Game,
  Player,
  Team,
  GameSubmission,
  SyncStatus,
} from './types';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize and return the IndexedDB database instance
 */
export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Game events store - primary offline storage
      if (!db.objectStoreNames.contains(STORES.EVENTS)) {
        const eventsStore = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
        eventsStore.createIndex('by_game', 'game_id', { unique: false });
        eventsStore.createIndex('by_client_event_id', 'client_event_id', { unique: true });
        eventsStore.createIndex('by_sync_status', 'sync_status', { unique: false });
        eventsStore.createIndex('by_game_and_period', ['game_id', 'period'], { unique: false });
      }

      // Games store - cached game data
      if (!db.objectStoreNames.contains(STORES.GAMES)) {
        const gamesStore = db.createObjectStore(STORES.GAMES, { keyPath: 'id' });
        gamesStore.createIndex('by_status', 'game_status', { unique: false });
      }

      // Players store - cached roster data
      if (!db.objectStoreNames.contains(STORES.PLAYERS)) {
        const playersStore = db.createObjectStore(STORES.PLAYERS, { keyPath: 'id' });
        playersStore.createIndex('by_team', 'team_id', { unique: false });
        playersStore.createIndex('by_jersey', ['team_id', 'jersey_number'], { unique: false });
      }

      // Teams store - cached team data
      if (!db.objectStoreNames.contains(STORES.TEAMS)) {
        db.createObjectStore(STORES.TEAMS, { keyPath: 'id' });
      }

      // Game submissions store
      if (!db.objectStoreNames.contains(STORES.SUBMISSIONS)) {
        const submissionsStore = db.createObjectStore(STORES.SUBMISSIONS, { keyPath: 'id' });
        submissionsStore.createIndex('by_game', 'game_id', { unique: true });
      }

      // Sync queue for retry operations
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('by_priority', 'priority', { unique: false });
        syncStore.createIndex('by_created_at', 'created_at', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Generic get operation
 */
async function getItem<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic put operation
 */
async function putItem<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic delete operation
 */
async function deleteItem(storeName: string, key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all items from a store
 */
async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get items by index
 */
async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============= Game Events API =============

export async function saveGameEvent(event: GameEvent): Promise<void> {
  await putItem(STORES.EVENTS, event);
}

export async function getGameEvent(id: string): Promise<GameEvent | undefined> {
  return getItem<GameEvent>(STORES.EVENTS, id);
}

export async function getGameEventByClientId(clientEventId: string): Promise<GameEvent | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.EVENTS, 'readonly');
    const store = tx.objectStore(STORES.EVENTS);
    const index = store.index('by_client_event_id');
    const request = index.get(clientEventId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getGameEvents(gameId: string): Promise<GameEvent[]> {
  const events = await getByIndex<GameEvent>(STORES.EVENTS, 'by_game', gameId);
  // Filter out soft-deleted events and sort by game time
  return events
    .filter(e => !e.deleted_at)
    .sort((a, b) => {
      if (a.period !== b.period) return a.period - b.period;
      return a.game_time_seconds - b.game_time_seconds;
    });
}

export async function getGameEventsByPeriod(gameId: string, period: number): Promise<GameEvent[]> {
  const events = await getByIndex<GameEvent>(STORES.EVENTS, 'by_game_and_period', [gameId, period]);
  return events
    .filter(e => !e.deleted_at)
    .sort((a, b) => a.game_time_seconds - b.game_time_seconds);
}

export async function getPendingEvents(): Promise<GameEvent[]> {
  return getByIndex<GameEvent>(STORES.EVENTS, 'by_sync_status', 'pending');
}

export async function updateEventSyncStatus(
  eventId: string,
  status: SyncStatus,
  syncedAt?: string
): Promise<void> {
  const event = await getGameEvent(eventId);
  if (event) {
    event.sync_status = status;
    event.synced_at = syncedAt;
    event.updated_at = new Date().toISOString();
    await saveGameEvent(event);
  }
}

export async function softDeleteGameEvent(eventId: string): Promise<void> {
  const event = await getGameEvent(eventId);
  if (event) {
    event.deleted_at = new Date().toISOString();
    event.sync_status = 'pending'; // Mark for sync
    event.updated_at = new Date().toISOString();
    await saveGameEvent(event);
  }
}

export async function undoDeleteGameEvent(eventId: string): Promise<void> {
  const event = await getGameEvent(eventId);
  if (event) {
    event.deleted_at = undefined;
    event.sync_status = 'pending';
    event.updated_at = new Date().toISOString();
    await saveGameEvent(event);
  }
}

// ============= Games API =============

export async function saveGame(game: Game): Promise<void> {
  await putItem(STORES.GAMES, game);
}

export async function getGame(id: string): Promise<Game | undefined> {
  return getItem<Game>(STORES.GAMES, id);
}

export async function getAllGames(): Promise<Game[]> {
  return getAllItems<Game>(STORES.GAMES);
}

// ============= Players API =============

export async function savePlayer(player: Player): Promise<void> {
  await putItem(STORES.PLAYERS, player);
}

export async function savePlayers(players: Player[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYERS, 'readwrite');
    const store = tx.objectStore(STORES.PLAYERS);

    players.forEach(player => store.put(player));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  return getItem<Player>(STORES.PLAYERS, id);
}

export async function getTeamPlayers(teamId: string): Promise<Player[]> {
  return getByIndex<Player>(STORES.PLAYERS, 'by_team', teamId);
}

export async function getPlayerByJersey(teamId: string, jerseyNumber: number): Promise<Player | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYERS, 'readonly');
    const store = tx.objectStore(STORES.PLAYERS);
    const index = store.index('by_jersey');
    const request = index.get([teamId, jerseyNumber]);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============= Teams API =============

export async function saveTeam(team: Team): Promise<void> {
  await putItem(STORES.TEAMS, team);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  return getItem<Team>(STORES.TEAMS, id);
}

// ============= Game Submissions API =============

export async function saveGameSubmission(submission: GameSubmission): Promise<void> {
  await putItem(STORES.SUBMISSIONS, submission);
}

export async function getGameSubmission(gameId: string): Promise<GameSubmission | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SUBMISSIONS, 'readonly');
    const store = tx.objectStore(STORES.SUBMISSIONS);
    const index = store.index('by_game');
    const request = index.get(gameId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============= Sync Queue API =============

interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  store: string;
  data: unknown;
  priority: number;
  retries: number;
  created_at: string;
  last_error?: string;
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.add(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAllItems<SyncQueueItem>(STORES.SYNC_QUEUE);
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  await deleteItem(STORES.SYNC_QUEUE, String(id));
}

// ============= Utility Functions =============

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const storeNames = Object.values(STORES);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');

    storeNames.forEach(storeName => {
      tx.objectStore(storeName).clear();
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStorageStats(): Promise<{ [key: string]: number }> {
  const stats: { [key: string]: number } = {};

  for (const storeName of Object.values(STORES)) {
    const items = await getAllItems(storeName);
    stats[storeName] = items.length;
  }

  return stats;
}
