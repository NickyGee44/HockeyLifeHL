import Link from 'next/link';
import type { PlayerBadge } from '@/lib/types';
import { PlayerBadgeGroup } from './PlayerBadgeGroup';

interface PlayerNameLinkProps {
  playerId: string;
  playerName: string;
  leagueSlug: string;
  badges?: PlayerBadge[];
  showBadges?: boolean;
  className?: string;
}

export function PlayerNameLink({
  playerId,
  playerName,
  leagueSlug,
  badges,
  showBadges,
  className,
}: PlayerNameLinkProps) {
  return (
    <Link
      href={`/${leagueSlug}/players/${playerId}`}
      className={`inline-flex items-center gap-1.5 hover:text-[var(--league-primary)] transition-colors ${className ?? ''}`}
    >
      <span>{playerName}</span>
      {showBadges && badges && badges.length > 0 && (
        <PlayerBadgeGroup badges={badges} />
      )}
    </Link>
  );
}
