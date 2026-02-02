'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface UseDraftReliabilityOptions {
  draftId: string;
  onStateVersionMismatch?: (serverVersion: number, localVersion: number) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  pollInterval?: number; // Fallback polling interval in ms (default 5000)
  driftCheckInterval?: number; // State drift check interval in ms (default 30000)
}

interface UseDraftReliabilityReturn {
  connectionState: ConnectionState;
  localStateVersion: number;
  setLocalStateVersion: (version: number) => void;
  isPollingFallback: boolean;
  lastSyncTime: Date | null;
  forceSync: () => Promise<void>;
  processedEventIds: React.MutableRefObject<Set<string>>;
}

/**
 * Custom hook for draft room reliability features:
 * - Connection state monitoring
 * - Fallback polling when disconnected
 * - State version tracking for drift detection
 * - Event deduplication
 */
export function useDraftReliability({
  draftId,
  onStateVersionMismatch,
  onConnectionChange,
  pollInterval = 5000,
  driftCheckInterval = 30000,
}: UseDraftReliabilityOptions): UseDraftReliabilityReturn {
  const [supabase] = useState(() => createClient());
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [localStateVersion, setLocalStateVersion] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const processedEventIds = useRef<Set<string>>(new Set());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const driftCheckRef = useRef<NodeJS.Timeout | null>(null);

  const isPollingFallback = connectionState === 'disconnected' || connectionState === 'reconnecting';

  // Update connection state and notify
  const updateConnectionState = useCallback(
    (newState: ConnectionState) => {
      setConnectionState((prev) => {
        if (prev !== newState) {
          console.log(`[DraftReliability] Connection state: ${prev} -> ${newState}`);
          onConnectionChange?.(newState);
        }
        return newState;
      });
    },
    [onConnectionChange]
  );

  // Force sync with server
  const forceSync = useCallback(async () => {
    try {
      // Note: state_version column exists in DB but not in generated types yet
      const { data, error } = await (supabase
        .from('drafts')
        .select('state_version')
        .eq('id', draftId)
        .single() as any) as { data: { state_version: number } | null; error: any };

      if (error) {
        console.error('[DraftReliability] Error syncing state version:', error);
        return;
      }

      setLastSyncTime(new Date());

      if (data && data.state_version !== localStateVersion) {
        console.log(
          `[DraftReliability] State drift detected: local=${localStateVersion}, server=${data.state_version}`
        );
        onStateVersionMismatch?.(data.state_version, localStateVersion);
      }
    } catch (err) {
      console.error('[DraftReliability] Force sync failed:', err);
    }
  }, [draftId, localStateVersion, onStateVersionMismatch, supabase]);

  // Set up realtime connection monitoring
  useEffect(() => {
    const channel = supabase
      .channel(`draft-reliability:${draftId}`)
      .on('presence', { event: 'sync' }, () => {
        updateConnectionState('connected');
      })
      .on('system', { event: '*' }, (payload) => {
        if (payload.event === 'disconnect') {
          updateConnectionState('disconnected');
        } else if (payload.event === 'reconnect') {
          updateConnectionState('reconnecting');
        }
      })
      .subscribe((status) => {
        switch (status) {
          case 'SUBSCRIBED':
            updateConnectionState('connected');
            break;
          case 'CLOSED':
          case 'CHANNEL_ERROR':
            updateConnectionState('disconnected');
            break;
          case 'TIMED_OUT':
            updateConnectionState('reconnecting');
            break;
        }
      });

    channelRef.current = channel;

    // Track presence to monitor connection
    channel.track({ user_id: 'reliability_monitor', online_at: new Date().toISOString() });

    return () => {
      channel.unsubscribe();
    };
  }, [draftId, supabase, updateConnectionState]);

  // Fallback polling when disconnected
  useEffect(() => {
    if (isPollingFallback) {
      console.log(`[DraftReliability] Starting fallback polling (every ${pollInterval}ms)`);

      pollIntervalRef.current = setInterval(() => {
        forceSync();
      }, pollInterval);

      // Immediate sync on disconnect
      forceSync();
    } else {
      if (pollIntervalRef.current) {
        console.log('[DraftReliability] Stopping fallback polling');
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isPollingFallback, pollInterval, forceSync]);

  // Periodic state drift check (even when connected)
  useEffect(() => {
    driftCheckRef.current = setInterval(() => {
      forceSync();
    }, driftCheckInterval);

    return () => {
      if (driftCheckRef.current) {
        clearInterval(driftCheckRef.current);
      }
    };
  }, [driftCheckInterval, forceSync]);

  // Clean up old event IDs periodically (prevent memory leak)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (processedEventIds.current.size > 1000) {
        // Keep only the last 500 events
        const entries = Array.from(processedEventIds.current);
        processedEventIds.current = new Set(entries.slice(-500));
      }
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    connectionState,
    localStateVersion,
    setLocalStateVersion,
    isPollingFallback,
    lastSyncTime,
    forceSync,
    processedEventIds,
  };
}
