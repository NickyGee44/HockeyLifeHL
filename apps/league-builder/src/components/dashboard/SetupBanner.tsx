'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, X, CreditCard, Users, Calendar, FileEdit } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import type { LeagueSetupIssue } from '@/lib/actions/setup-status';

const ICON_MAP = {
  draft: FileEdit,
  billing_incomplete: CreditCard,
  no_teams: Users,
  no_season: Calendar,
  next_season: Calendar,
} as const;

const COLOR_MAP = {
  draft: 'from-yellow-500/20 via-yellow-500/10 to-transparent border-yellow-500/30',
  billing_incomplete: 'from-red-500/20 via-red-500/10 to-transparent border-red-500/30',
  no_teams: 'from-orange-500/20 via-orange-500/10 to-transparent border-orange-500/30',
  no_season: 'from-orange-500/20 via-orange-500/10 to-transparent border-orange-500/30',
  next_season: 'from-purple-500/20 via-purple-500/10 to-transparent border-purple-500/30',
} as const;

const ICON_COLOR_MAP = {
  draft: 'text-yellow-500',
  billing_incomplete: 'text-red-500',
  no_teams: 'text-orange-500',
  no_season: 'text-orange-500',
  next_season: 'text-purple-400',
} as const;

interface SetupBannerProps {
  issues: LeagueSetupIssue[];
}

export function SetupBanner({ issues }: SetupBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleIssues = issues.filter(
    (issue) => !dismissedIds.has(`${issue.leagueId}-${issue.type}`)
  );

  if (visibleIssues.length === 0) return null;

  // Billing issues are highest priority, then draft, then others
  const sortedIssues = [...visibleIssues].sort((a, b) => {
    const priority = { billing_incomplete: 0, draft: 1, no_teams: 2, next_season: 3, no_season: 4 };
    return priority[a.type] - priority[b.type];
  });

  return (
    <div className="space-y-3 mb-6">
      {sortedIssues.map((issue) => {
        const Icon = ICON_MAP[issue.type];
        const colorClass = COLOR_MAP[issue.type];
        const iconColor = ICON_COLOR_MAP[issue.type];
        const key = `${issue.leagueId}-${issue.type}`;

        return (
          <div
            key={key}
            className={cn(
              'relative bg-gradient-to-r border rounded-xl p-4',
              colorClass
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn('p-2 rounded-lg bg-white/5 shrink-0', iconColor)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={cn('w-4 h-4 shrink-0', iconColor)} />
                  <h3 className="text-sm font-semibold text-white truncate">
                    {issue.leagueName}
                  </h3>
                </div>
                <p className="text-sm text-neutral-300">{issue.message}</p>
                <Link
                  href={issue.actionUrl}
                  className={cn(
                    'inline-flex items-center gap-1.5 mt-2 text-sm font-medium transition-colors',
                    issue.type === 'billing_incomplete'
                      ? 'text-red-400 hover:text-red-300'
                      : issue.type === 'draft'
                        ? 'text-yellow-400 hover:text-yellow-300'
                        : issue.type === 'next_season'
                          ? 'text-purple-300 hover:text-purple-200'
                        : 'text-orange-400 hover:text-orange-300'
                  )}
                >
                  {issue.actionLabel}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <button
                onClick={() =>
                  setDismissedIds((prev) => new Set([...prev, key]))
                }
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
