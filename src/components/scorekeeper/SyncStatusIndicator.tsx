"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { syncOfflineQueue, getQueuedEntriesCount } from "@/lib/scorekeeper/offline-queue";
import { toast } from "sonner";

export function SyncStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    // Check queue count
    const updateQueueCount = async () => {
      const count = await getQueuedEntriesCount();
      setQueuedCount(count);
    };

    updateQueueCount();
    const interval = setInterval(updateQueueCount, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      toast.error("Cannot sync while offline");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue();
      if (result.success) {
        toast.success(`Synced ${result.synced} entries`);
        setQueuedCount(0);
      } else {
        toast.error("Sync failed");
      }
    } catch (error) {
      toast.error("Sync error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Status */}
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className="h-8 px-3"
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3 mr-1" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 mr-1" />
            Offline
          </>
        )}
      </Badge>

      {/* Queued Entries Count */}
      {queuedCount > 0 && (
        <Badge variant="outline" className="h-8 px-3">
          {queuedCount} pending
        </Badge>
      )}

      {/* Manual Sync Button */}
      {queuedCount > 0 && isOnline && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="h-8"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync Now
            </>
          )}
        </Button>
      )}

      {/* All Synced Indicator */}
      {queuedCount === 0 && isOnline && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          All synced
        </div>
      )}
    </div>
  );
}
