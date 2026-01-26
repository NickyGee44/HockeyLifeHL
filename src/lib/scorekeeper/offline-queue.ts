/**
 * Offline Queue System for Scorekeeper Stat Entry
 *
 * Uses IndexedDB to queue stat entries when offline,
 * then syncs them when connection is restored.
 */

interface QueuedEntry {
  id: string;
  gameId: string;
  playerId: string;
  teamId: string;
  statType: string;
  period: number;
  timestamp: string;
  jerseyNumber: number;
  playerName: string;
  retryCount: number;
  createdAt: string;
}

const DB_NAME = 'scorekeeper-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-entries';

/**
 * Initialize IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('gameId', 'gameId', { unique: false });
      }
    };
  });
}

/**
 * Add entry to offline queue
 */
export async function addToOfflineQueue(
  entry: Omit<QueuedEntry, 'id' | 'retryCount' | 'createdAt'>
): Promise<void> {
  try {
    const db = await openDatabase();

    const queuedEntry: QueuedEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queuedEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error adding to offline queue:', error);
    throw error;
  }
}

/**
 * Get all queued entries
 */
export async function getQueuedEntries(): Promise<QueuedEntry[]> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as QueuedEntry[]);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting queued entries:', error);
    return [];
  }
}

/**
 * Get count of queued entries
 */
export async function getQueuedEntriesCount(): Promise<number> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error counting queued entries:', error);
    return 0;
  }
}

/**
 * Remove entry from queue
 */
export async function removeFromQueue(id: string): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error removing from queue:', error);
    throw error;
  }
}

/**
 * Sync all queued entries to server
 */
export async function syncOfflineQueue(): Promise<{ success: boolean; synced: number; failed: number }> {
  if (!navigator.onLine) {
    return { success: false, synced: 0, failed: 0 };
  }

  try {
    const entries = await getQueuedEntries();

    if (entries.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    // Process entries in order (oldest first)
    const sortedEntries = entries.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const entry of sortedEntries) {
      try {
        // Submit to server
        const response = await fetch('/api/scorekeepers/submit-stat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: entry.gameId,
            playerId: entry.playerId,
            teamId: entry.teamId,
            statType: entry.statType,
            period: entry.period,
            timestamp: entry.timestamp,
          }),
        });

        if (response.ok) {
          // Success - remove from queue
          await removeFromQueue(entry.id);
          synced++;
        } else {
          // Failed - leave in queue
          failed++;
          console.error('Failed to sync entry:', entry.id, await response.text());
        }
      } catch (error) {
        console.error('Error syncing entry:', entry.id, error);
        failed++;
      }
    }

    return {
      success: failed === 0,
      synced,
      failed,
    };
  } catch (error) {
    console.error('Error syncing offline queue:', error);
    return { success: false, synced: 0, failed: 0 };
  }
}

/**
 * Clear all queued entries (use with caution!)
 */
export async function clearQueue(): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing queue:', error);
    throw error;
  }
}

/**
 * Initialize auto-sync on connection restore
 */
export function initializeAutoSync() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('Connection restored, syncing offline queue...');
    syncOfflineQueue();
  });
}
