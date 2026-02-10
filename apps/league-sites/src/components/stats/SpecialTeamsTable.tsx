'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown, Medal, Zap } from 'lucide-react';
import type { SpecialTeamsLeader } from '@/lib/types';

interface SpecialTeamsTableProps {
  leaders: SpecialTeamsLeader[];
  leagueSlug: string;
}

type SortKey = 'pp_points' | 'pp_goals' | 'pp_assists' | 'sh_goals' | 'sh_assists' | 'gwg' | 'eng';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20">
        <Medal className="w-4 h-4 text-amber-400" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-surface-hover)]">
        <Medal className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20">
        <Medal className="w-4 h-4 text-amber-700" />
      </span>
    );
  }
  return <span className="text-[var(--color-text-muted)]">{rank}</span>;
}

export function SpecialTeamsTable({ leaders, leagueSlug }: SpecialTeamsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('pp_points');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...leaders].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  if (leaders.length === 0) {
    return (
      <div className="p-8 text-center">
        <Zap className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-[var(--color-text-secondary)]">
          No special teams stats available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)] w-12">
              Rank
            </th>
            <th className="text-left py-3 px-2 font-medium text-[var(--color-text-muted)]">
              Player
            </th>
            <SortHeader
              label="PPG"
              sortKey="pp_goals"
              currentSort={sortKey}
              sortAsc={sortAsc}
              onSort={handleSort}
              title="Power Play Goals"
            />
            <SortHeader
              label="PPA"
              sortKey="pp_assists"
              currentSort={sortKey}
              sortAsc={sortAsc}
              onSort={handleSort}
              title="Power Play Assists"
            />
            <SortHeader
              label="PPP"
              sortKey="pp_points"
              currentSort={sortKey}
              sortAsc={sortAsc}
              onSort={handleSort}
              title="Power Play Points"
            />
            <SortHeader
              label="SHG"
              sortKey="sh_goals"
              currentSort={sortKey}
              sortAsc={sortAsc}
              onSort={handleSort}
              title="Short-Handed Goals"
            />
            <SortHeader
              label="SHA"
              sortKey="sh_assists"
              currentSort={sortKey}
              sortAsc={sortAsc}
              onSort={handleSort}
              title="Short-Handed Assists"
            />
            <SortHeader
              label="GWG"
              sortKey="gwg"
              currentSort={sortKey}
              sortAsc={sortAsc}
              onSort={handleSort}
              title="Game-Winning Goals"
            />
            <SortHeader
              label="ENG"
              sortKey="eng"
              currentSort={sortKey}
              sortAsc={sortAsc}
              onSort={handleSort}
              title="Empty-Net Goals"
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((player, index) => (
            <tr
              key={`${player.player_id}-${player.team_id}`}
              className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <td className="py-3 px-2 text-center">
                <RankBadge rank={index + 1} />
              </td>
              <td className="py-3 px-2">
                <Link
                  href={`/${leagueSlug}/players/${player.player_id}`}
                  className="font-medium hover:text-[var(--league-primary)] transition-colors"
                >
                  {player.full_name}
                </Link>
              </td>
              <td className="py-3 px-2 text-center">
                <CellValue value={player.pp_goals} highlight={sortKey === 'pp_goals'} />
              </td>
              <td className="py-3 px-2 text-center">
                <CellValue value={player.pp_assists} highlight={sortKey === 'pp_assists'} />
              </td>
              <td className="py-3 px-2 text-center">
                <CellValue value={player.pp_points} highlight={sortKey === 'pp_points'} />
              </td>
              <td className="py-3 px-2 text-center">
                <CellValue value={player.sh_goals} highlight={sortKey === 'sh_goals'} />
              </td>
              <td className="py-3 px-2 text-center">
                <CellValue value={player.sh_assists} highlight={sortKey === 'sh_assists'} />
              </td>
              <td className="py-3 px-2 text-center">
                <CellValue value={player.gwg} highlight={sortKey === 'gwg'} />
              </td>
              <td className="py-3 px-2 text-center">
                <CellValue value={player.eng} highlight={sortKey === 'eng'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentSort,
  sortAsc,
  onSort,
  title,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  title?: string;
}) {
  const isActive = currentSort === sortKey;

  return (
    <th
      className="py-3 px-2 font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors text-center"
      onClick={() => onSort(sortKey)}
      title={title}
    >
      <div className="flex items-center justify-center gap-1">
        {label}
        {isActive ? (
          sortAsc ? (
            <ChevronUp className="w-3 h-3 text-[var(--league-primary)]" />
          ) : (
            <ChevronDown className="w-3 h-3 text-[var(--league-primary)]" />
          )
        ) : (
          <ChevronDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );
}

function CellValue({ value, highlight }: { value: number; highlight: boolean }) {
  return (
    <span
      className={
        highlight
          ? 'text-[var(--league-primary)] font-semibold'
          : ''
      }
    >
      {value}
    </span>
  );
}
