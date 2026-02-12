import * as SQLite from 'expo-sqlite';

const DB_NAME = 'hockeylife.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the SQLite database for offline caching.
 * Port of the IndexedDB cache-first pattern from player-companion.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeSchema(db);
  return db;
}

async function initializeSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0
    );
  `);
}

/**
 * Cache-first data fetching pattern.
 * Returns cached data immediately, then fetches fresh data in background.
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000, // 5 minutes default
): Promise<T> {
  const database = await getDatabase();
  const now = Date.now();

  // Try cache first
  const cached = await database.getFirstAsync<{ value: string; expires_at: number }>(
    'SELECT value, expires_at FROM cache WHERE key = ?',
    [key],
  );

  if (cached && cached.expires_at > now) {
    return JSON.parse(cached.value) as T;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  await database.runAsync(
    'INSERT OR REPLACE INTO cache (key, value, expires_at, updated_at) VALUES (?, ?, ?, ?)',
    [key, JSON.stringify(data), now + ttlMs, now],
  );

  return data;
}

/**
 * Store an action for later sync when back online.
 */
export async function queuePendingSync(action: string, payload: unknown) {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO pending_sync (action, payload, created_at) VALUES (?, ?, ?)',
    [action, JSON.stringify(payload), Date.now()],
  );
}

/**
 * Process all pending sync actions.
 */
export async function processPendingSync(
  processor: (action: string, payload: unknown) => Promise<boolean>,
) {
  const database = await getDatabase();
  const pending = await database.getAllAsync<{
    id: number;
    action: string;
    payload: string;
  }>('SELECT id, action, payload FROM pending_sync ORDER BY created_at ASC');

  for (const item of pending) {
    const success = await processor(item.action, JSON.parse(item.payload));
    if (success) {
      await database.runAsync('DELETE FROM pending_sync WHERE id = ?', [item.id]);
    } else {
      await database.runAsync(
        'UPDATE pending_sync SET retry_count = retry_count + 1 WHERE id = ?',
        [item.id],
      );
    }
  }
}

/**
 * Clear all cached data (for logout, etc.)
 */
export async function clearCache() {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM cache');
}

/**
 * Invalidate cache entries matching a key prefix.
 */
export async function invalidateCache(keyPrefix: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM cache WHERE key LIKE ?', [`${keyPrefix}%`]);
}
