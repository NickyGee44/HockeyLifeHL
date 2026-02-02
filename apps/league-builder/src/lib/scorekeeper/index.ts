// PWA Scorekeeper Module
// Offline-first stat entry with Supabase Realtime sync

// Types
export * from './types';

// IndexedDB operations
export * from './indexed-db';

// Sync service
export { getSyncService } from './sync-service';
export type { ScorekeeperSyncService } from './sync-service';

// React hooks
export {
  useSyncState,
  useGameSession,
  useGameEvents,
  usePeriodEvents,
  useGameScore,
  usePlayerSearch,
} from './use-sync';
