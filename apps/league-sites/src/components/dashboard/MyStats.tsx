'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, ChevronRight } from 'lucide-react';

interface PlayerStats {
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  penalty_minutes: number;
  plus_minus: number;
}

interface MyStatsProps {
  playerId?: string;
  leagueSlug: string;
}

export function MyStats({ playerId, leagueSlug }: MyStatsProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!playerId) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      const supabase = createClient();

      // Try to get player stats from RPC
      const { data, error } = await supabase.rpc('get_player_career_stats', {
        p_player_id: playerId,
        p_season_id: null,
      });

      if (!error && data) {
        setStats(data);
      }
      setIsLoading(false);
    };

    fetchStats();
  }, [playerId]);

  if (!playerId) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--league-primary)]" />
          My Stats
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
          Join a team to track your stats
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--league-primary)]" />
          My Stats
        </h3>
        <Link
          href={`/${leagueSlug}/stats`}
          className="text-sm text-[var(--league-primary)] hover:underline flex items-center gap-1"
        >
          Leaderboard
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-4">
          <div className="animate-pulse grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 bg-[var(--color-surface-hover)] rounded-lg" />
            ))}
          </div>
        </div>
      ) : stats ? (
        <div className="p-4 grid grid-cols-3 gap-3">
          <StatBox label="GP" value={stats.games_played} />
          <StatBox label="G" value={stats.goals} highlight />
          <StatBox label="A" value={stats.assists} highlight />
          <StatBox label="PTS" value={stats.points} highlight primary />
          <StatBox label="PIM" value={stats.penalty_minutes} />
          <StatBox label="+/-" value={stats.plus_minus} showSign />
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No stats recorded yet
          </p>
        </div>
      )}
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  highlight?: boolean;
  primary?: boolean;
  showSign?: boolean;
}

function StatBox({ label, value, highlight, primary, showSign }: StatBoxProps) {
  const displayValue = showSign && value > 0 ? `+${value}` : value;
  const valueColor = showSign
    ? value > 0
      ? 'text-green-400'
      : value < 0
        ? 'text-red-400'
        : 'text-[var(--color-text-primary)]'
    : primary
      ? 'text-[var(--league-primary)]'
      : 'text-[var(--color-text-primary)]';

  return (
    <div
      className={`p-3 rounded-lg text-center ${
        highlight
          ? 'bg-[var(--color-surface-hover)]'
          : 'bg-transparent'
      }`}
    >
      <p className={`text-xl font-bold ${valueColor}`}>
        {displayValue}
      </p>
      <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
