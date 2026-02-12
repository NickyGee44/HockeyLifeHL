'use client';

import { useTranslations } from 'next-intl';
import { useSyncState } from '@/lib/scorekeeper';
import { cn } from '@hockey-life/ui';

/**
 * SyncStatusBanner - Shows sync status (online/offline/syncing)
 * Displays at top of scorekeeper UI with gold accents
 * iPad-optimized with large touch targets
 */
export function SyncStatusBanner() {
  const t = useTranslations('scorekeeper.sync');
  const syncState = useSyncState();

  const getStatusConfig = () => {
    if (!syncState.isOnline) {
      return {
        label: t('offlineMode'),
        description: t('offlineDescription'),
        icon: OfflineIcon,
        bgClass: 'bg-amber-500/10 border-amber-500/30',
        textClass: 'text-amber-400',
        pulseClass: '',
      };
    }

    if (syncState.isSyncing) {
      return {
        label: t('syncing'),
        description: t('eventsPending', { count: syncState.pendingCount }),
        icon: SyncingIcon,
        bgClass: 'bg-rink-500/10 border-rink-500/30',
        textClass: 'text-rink-400',
        pulseClass: 'animate-pulse',
      };
    }

    if (syncState.pendingCount > 0) {
      return {
        label: t('pendingSync'),
        description: t('eventsWaiting', { count: syncState.pendingCount }),
        icon: PendingIcon,
        bgClass: 'bg-rink-500/10 border-rink-500/30',
        textClass: 'text-rink-500',
        pulseClass: '',
      };
    }

    if (syncState.lastError) {
      return {
        label: t('syncError'),
        description: syncState.lastError,
        icon: ErrorIcon,
        bgClass: 'bg-red-500/10 border-red-500/30',
        textClass: 'text-red-400',
        pulseClass: '',
      };
    }

    return {
      label: t('online'),
      description: syncState.lastSyncAt
        ? t('lastSynced', { time: formatTimeAgo(syncState.lastSyncAt) })
        : t('connectedToServer'),
      icon: OnlineIcon,
      bgClass: 'bg-emerald-500/10 border-emerald-500/30',
      textClass: 'text-emerald-400',
      pulseClass: '',
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300',
        config.bgClass,
        config.pulseClass
      )}
    >
      <StatusIcon className={cn('w-5 h-5 flex-shrink-0', config.textClass)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', config.textClass)}>
          {config.label}
        </p>
        <p className="text-xs text-neutral-400 truncate">{config.description}</p>
      </div>
      {syncState.pendingCount > 0 && (
        <div className="flex-shrink-0 bg-rink-500/20 text-rink-400 text-xs font-bold px-2 py-0.5 rounded-full">
          {syncState.pendingCount}
        </div>
      )}
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

// Icon components
function OnlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function OfflineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 8.82a15.91 15.91 0 0 1 4.17-2.65" strokeLinecap="round" />
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" strokeLinecap="round" />
      <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" strokeLinecap="round" />
      <path d="M5 13a10 10 0 0 1 5.24-2.76" strokeLinecap="round" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function SyncingIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(className, 'animate-spin')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
    </svg>
  );
}

function PendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}
