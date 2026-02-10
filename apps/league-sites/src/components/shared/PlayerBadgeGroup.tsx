import type { PlayerBadge } from '@/lib/types';
import { BadgeIcon } from './PlayerBadge';

interface PlayerBadgeGroupProps {
  badges: PlayerBadge[];
  maxVisible?: number;
  size?: 'sm' | 'md';
}

export function PlayerBadgeGroup({ badges, maxVisible = 5, size = 'sm' }: PlayerBadgeGroupProps) {
  if (!badges || badges.length === 0) return null;

  const visible = badges.slice(0, maxVisible);
  const overflow = badges.length - maxVisible;

  return (
    <span className="inline-flex items-center gap-1">
      {visible.map((badge) => (
        <BadgeIcon key={badge.id} badge={badge} size={size} />
      ))}
      {overflow > 0 && (
        <span className="text-xs text-[var(--color-text-muted)] font-medium">
          +{overflow}
        </span>
      )}
    </span>
  );
}
