'use client';

import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui/lib/utils';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface ConnectionStatusProps {
  state: ConnectionState;
  isPollingFallback: boolean;
  lastSyncTime: Date | null;
  onForceSync: () => void;
}

export function ConnectionStatus({
  state,
  isPollingFallback,
  lastSyncTime,
  onForceSync,
}: ConnectionStatusProps) {
  const t = useTranslations('draft');

  // Only show when there's an issue
  if (state === 'connected' && !isPollingFallback) {
    return null;
  }

  const getStatusConfig = () => {
    switch (state) {
      case 'connecting':
        return {
          icon: RefreshCw,
          iconClass: 'animate-spin text-rink-500',
          bgClass: 'bg-rink-500/10 border-rink-500/30',
          textClass: 'text-rink-400',
          message: t('connectingToDraft'),
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          iconClass: 'text-red-500',
          bgClass: 'bg-red-500/10 border-red-500/30',
          textClass: 'text-red-400',
          message: t('connectionLost'),
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          iconClass: 'animate-spin text-yellow-500',
          bgClass: 'bg-yellow-500/10 border-yellow-500/30',
          textClass: 'text-yellow-400',
          message: t('reconnecting'),
        };
      default:
        return {
          icon: Wifi,
          iconClass: 'text-green-500',
          bgClass: 'bg-green-500/10 border-green-500/30',
          textClass: 'text-green-400',
          message: t('connected'),
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-2',
        config.bgClass
      )}
    >
      <Icon className={cn('h-4 w-4', config.iconClass)} />
      <div className="flex-1">
        <p className={cn('text-sm font-medium', config.textClass)}>
          {config.message}
        </p>
        {isPollingFallback && lastSyncTime && (
          <p className="text-xs text-neutral-500">
            {t('lastSync', { time: lastSyncTime.toLocaleTimeString() })}
          </p>
        )}
      </div>

      {(state === 'disconnected' || isPollingFallback) && (
        <button
          onClick={onForceSync}
          className="flex items-center gap-1.5 rounded-md bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
          {t('syncNow')}
        </button>
      )}
    </div>
  );
}

/**
 * Compact version for header
 */
export function ConnectionStatusBadge({
  state,
}: {
  state: ConnectionState;
}) {
  const t = useTranslations('draft');

  if (state === 'connected') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-xs text-neutral-400">{t('live')}</span>
      </div>
    );
  }

  if (state === 'disconnected') {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1">
        <WifiOff className="h-3 w-3 text-red-500" />
        <span className="text-xs text-red-400">{t('offline')}</span>
      </div>
    );
  }

  if (state === 'reconnecting' || state === 'connecting') {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-yellow-500/10 px-2 py-1">
        <RefreshCw className="h-3 w-3 animate-spin text-yellow-500" />
        <span className="text-xs text-yellow-400">
          {state === 'connecting' ? t('connecting') : t('reconnectingBadge')}
        </span>
      </div>
    );
  }

  return null;
}
