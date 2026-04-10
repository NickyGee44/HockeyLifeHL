import { Trophy } from 'lucide-react';
import type { LeagueAward } from '@/lib/types';

interface AwardCardProps {
  award: LeagueAward;
}

const CATEGORY_ICONS: Record<string, string> = {
  mvp: 'MVP',
  top_scorer: 'TOP',
  best_goalie: 'G',
  rookie: 'ROY',
  sportsmanship: 'SP',
  custom: 'AWD',
};

export function AwardCard({ award }: AwardCardProps) {
  const playerName = award.player?.full_name || null;
  const teamName = award.team?.name || null;

  return (
    <div className="glass-card rounded-xl p-5 group">
      <div className="flex items-start gap-4">
        {/* Trophy icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-[var(--league-primary)]/10 flex items-center justify-center group-hover:bg-[var(--league-primary)]/20 transition-colors">
          {award.image_url ? (
            <img
              src={award.image_url}
              alt={award.award_name}
              className="w-8 h-8 object-contain"
            />
          ) : (
            <Trophy className="w-6 h-6 text-[var(--league-primary)]" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-[var(--color-text-primary)] text-sm">
            {award.award_name}
          </h4>

          <p className="text-xs text-[var(--league-primary)] font-medium uppercase tracking-wider mt-0.5">
            {CATEGORY_ICONS[award.category] || award.category}
          </p>

          {(playerName || teamName) && (
            <div className="mt-2">
              {playerName && (
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {playerName}
                </p>
              )}
              {teamName && (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {teamName}
                </p>
              )}
            </div>
          )}

          {award.description && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-2">
              {award.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
