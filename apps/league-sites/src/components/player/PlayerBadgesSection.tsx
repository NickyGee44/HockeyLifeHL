import { Trophy } from 'lucide-react';
import type { PlayerBadge } from '@/lib/types';
import { BadgeCard } from '../shared/PlayerBadge';

interface PlayerBadgesSectionProps {
  badges: PlayerBadge[];
  seasonId?: string;
}

export function PlayerBadgesSection({ badges, seasonId }: PlayerBadgesSectionProps) {
  if (!badges || badges.length === 0) return null;

  const filtered = seasonId
    ? badges.filter((b) => b.season_id === seasonId)
    : badges;

  if (filtered.length === 0) return null;

  // Group by season, newest first
  const grouped = groupBySeasonSorted(filtered);

  return (
    <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
        <Trophy className="w-5 h-5 text-amber-500" />
        Achievements
      </h2>
      <div className="space-y-6">
        {grouped.map(({ seasonName, badges: seasonBadges }) => (
          <div key={seasonName}>
            <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
              {seasonName}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {seasonBadges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function groupBySeasonSorted(badges: PlayerBadge[]) {
  const map = new Map<string, { seasonName: string; badges: PlayerBadge[]; latestDate: string }>();

  for (const badge of badges) {
    const key = badge.season_id;
    const existing = map.get(key);
    if (existing) {
      existing.badges.push(badge);
      if (badge.created_at > existing.latestDate) {
        existing.latestDate = badge.created_at;
      }
    } else {
      map.set(key, {
        seasonName: badge.season?.name ?? 'Unknown Season',
        badges: [badge],
        latestDate: badge.created_at,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}
