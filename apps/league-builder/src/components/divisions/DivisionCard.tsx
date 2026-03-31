'use client';

/**
 * Division Card Component
 *
 * Displays a division card with team count and management actions.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import {
  Users,
  Edit,
  Trash2,
  MoreVertical,
  Clock,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DivisionWithTeamCount } from '@/lib/actions/divisions';
import { buildTeamDetailHref } from '@/lib/dashboard/workspace-routes';

// ==============================================================================
// TYPES
// ==============================================================================

interface DivisionCardProps {
  division: DivisionWithTeamCount;
  leagueId: string;
  locale: string;
  onEdit: (division: DivisionWithTeamCount) => void;
  onDelete: (division: DivisionWithTeamCount) => void;
  teams?: Array<{
    id: string;
    name: string;
    short_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
  }>;
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export function DivisionCard({
  division,
  leagueId,
  locale,
  onEdit,
  onDelete,
  teams = [],
}: DivisionCardProps) {
  const t = useTranslations('divisions');
  const [isExpanded, setIsExpanded] = useState(false);

  const skillLevelColors: Record<string, string> = {
    A: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    B: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    C: 'bg-green-500/10 text-green-500 border-green-500/30',
    Beginner: 'bg-green-500/10 text-green-500 border-green-500/30',
    Intermediate: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    Advanced: 'bg-red-500/10 text-red-500 border-red-500/30',
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl overflow-hidden hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rink-500/10">
              <Trophy className="w-5 h-5 text-rink-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{division.name}</h3>
              {division.description && (
                <p className="text-sm text-neutral-400 mt-0.5 line-clamp-1">
                  {division.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(division)}>
                <Edit className="w-4 h-4 mr-2" />
                {t('editDivision')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(division)}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('deleteDivision')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800/50">
            <Users className="w-4 h-4 text-rink-500" />
            <span className="text-sm text-neutral-300">
              {t('card.team', { count: division.team_count })}
              {division.max_teams && (
                <span className="text-neutral-500"> {t('card.max', { max: division.max_teams })}</span>
              )}
            </span>
          </div>

          {division.skill_level && (
            <span
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-full border',
                skillLevelColors[division.skill_level] || 'bg-neutral-800 text-neutral-400 border-neutral-700'
              )}
            >
              {division.skill_level}
            </span>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800/50">
            <Clock className="w-4 h-4 text-neutral-500" />
            <span className="text-sm text-neutral-400">
              {t('card.durationPeriods', { duration: division.game_duration_minutes, periods: division.period_count })}
            </span>
          </div>
        </div>
      </div>

      {/* Teams Preview (Expandable) */}
      {division.team_count > 0 && (
        <div className="border-t border-white/10">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm text-neutral-400 hover:bg-white/[0.02] transition-colors"
          >
            <span>{t('viewTeams')}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isExpanded && teams.length > 0 && (
            <div className="px-5 pb-4 space-y-2">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={buildTeamDetailHref({
                    locale,
                    teamId: team.id,
                    leagueId,
                  })}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: team.primary_color || '#22D3EE' }}
                  >
                    {team.short_name?.substring(0, 2).toUpperCase() || team.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm text-neutral-300">{team.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="px-5 pb-5 pt-2 flex items-center gap-2">
        <Link
          href={`/${locale}/dashboard/leagues/${leagueId}/divisions/${division.id}`}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
            'bg-rink-500/10 text-rink-500 border border-rink-500/30',
            'hover:bg-rink-500/20 transition-colors text-sm font-medium'
          )}
        >
          <Users className="w-4 h-4" />
          {t('manageTeams')}
        </Link>
      </div>
    </div>
  );
}
