'use client';

import { cn } from '@hockey-life/ui';
import { useTranslations } from 'next-intl';
import { UserCheck, Clock } from 'lucide-react';

interface ScorekeeperBadgeProps {
  assigned: boolean;
  expiresAt?: string;
  accessCount?: number;
  className?: string;
}

export function ScorekeeperBadge({
  assigned,
  expiresAt,
  accessCount,
  className,
}: ScorekeeperBadgeProps) {
  const t = useTranslations('games');

  if (!assigned) {
    return null;
  }
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const hasAccessed = (accessCount || 0) > 0;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        isExpired
          ? 'bg-neutral-700/50 text-neutral-500'
          : hasAccessed
          ? 'bg-green-500/10 text-green-500'
          : 'bg-rink-500/10 text-rink-500',
        className
      )}
    >
      <UserCheck className="w-3 h-3" />
      <span>
        {isExpired ? t('scorekeeperBadge.expired') : hasAccessed ? t('scorekeeperBadge.active') : t('scorekeeperBadge.assigned')}
      </span>
      {!isExpired && expiresAt && (
        <>
          <span className="text-neutral-600">•</span>
          <Clock className="w-3 h-3" />
          <span className="text-[10px]">
            {new Date(expiresAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </>
      )}
    </div>
  );
}

export function ScorekeeperAssignmentInfo({
  token,
  accessLink,
  expiresAt,
  accessCount,
  lastAccessedAt,
  className,
}: {
  token: string;
  accessLink?: string;
  expiresAt: string;
  accessCount: number;
  lastAccessedAt: string | null;
  className?: string;
}) {
  const isExpired = new Date(expiresAt) < new Date();
  const resolvedAccessLink =
    accessLink ||
    `${process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca'}/scorekeeper?token=${token}`;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <ScorekeeperBadge
          assigned={true}
          expiresAt={expiresAt}
          accessCount={accessCount}
        />
        {isExpired && (
          <span className="text-xs text-neutral-500">Token expired</span>
        )}
      </div>

      {/* Token Display */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-neutral-400">Access Token</p>
        <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/50 border border-white/[0.06]">
          <span className="font-mono text-lg font-bold tracking-wider text-rink-500">
            {token}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(token)}
            className="text-xs text-neutral-400 hover:text-rink-500 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Access Link */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-neutral-400">Access Link</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={resolvedAccessLink}
            readOnly
            className="flex-1 px-3 py-2 text-xs font-mono bg-neutral-900/50 border border-white/[0.06] rounded-lg text-neutral-400"
          />
          <button
            onClick={() => navigator.clipboard.writeText(resolvedAccessLink)}
            className="px-3 py-2 text-xs font-medium text-rink-500 hover:bg-rink-500/10 rounded-lg transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-1">
          <p className="text-xs text-neutral-500">Access Count</p>
          <p className="text-sm font-semibold text-white">{accessCount || 0}</p>
        </div>
        {lastAccessedAt && (
          <div className="space-y-1">
            <p className="text-xs text-neutral-500">Last Accessed</p>
            <p className="text-sm font-semibold text-white">
              {new Date(lastAccessedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
