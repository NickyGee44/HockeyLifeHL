'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, ChevronRight, Shield } from 'lucide-react';

interface SkaterStats {
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  points_per_game: number;
}

interface GoalieStats {
  games_played: number;
  goals_against: number;
  saves: number;
  shutouts: number;
  goals_against_average: number;
  save_percentage: number;
}

interface MyStatsProps {
  playerId?: string;
  seasonId?: string | null;
  leagueSlug: string;
}

export function MyStats({ playerId, seasonId, leagueSlug }: MyStatsProps) {
  const [skaterStats, setSkaterStats] = useState<SkaterStats | null>(null);
  const [goalieStats, setGoalieStats] = useState<GoalieStats | null>(null);
  const [isLoading, setIsLoading] = useState(!!(playerId && seasonId));

  useEffect(() => {
    if (!playerId || !seasonId) return;

    const fetchStats = async () => {
      const supabase = createClient();

      // Fetch skater and goalie stats in parallel
      const [skaterResult, goalieResult] = await Promise.all([
        supabase
          .from('player_season_stats')
          .select('games_played, goals, assists, points, points_per_game')
          .eq('player_id', playerId)
          .eq('season_id', seasonId)
          .maybeSingle(),
        supabase
          .from('goalie_season_stats')
          .select('games_played, goals_against, saves, shutouts, goals_against_average, save_percentage')
          .eq('player_id', playerId)
          .eq('season_id', seasonId)
          .maybeSingle(),
      ]);

      if (!skaterResult.error && skaterResult.data) {
        setSkaterStats({
          games_played: Number(skaterResult.data.games_played) || 0,
          goals: Number(skaterResult.data.goals) || 0,
          assists: Number(skaterResult.data.assists) || 0,
          points: Number(skaterResult.data.points) || 0,
          points_per_game: Number(skaterResult.data.points_per_game) || 0,
        });
      }

      if (!goalieResult.error && goalieResult.data) {
        setGoalieStats({
          games_played: Number(goalieResult.data.games_played) || 0,
          goals_against: Number(goalieResult.data.goals_against) || 0,
          saves: Number(goalieResult.data.saves) || 0,
          shutouts: Number(goalieResult.data.shutouts) || 0,
          goals_against_average: Number(goalieResult.data.goals_against_average) || 0,
          save_percentage: Number(goalieResult.data.save_percentage) || 0,
        });
      }

      setIsLoading(false);
    };

    fetchStats();
  }, [playerId, seasonId]);

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

  const hasAnyStats = skaterStats || goalieStats;

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
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-[var(--color-surface-hover)] rounded-lg" />
            ))}
          </div>
        </div>
      ) : hasAnyStats ? (
        <div className="p-4 space-y-4">
          {/* Skater Stats */}
          {skaterStats && (
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="GP" value={skaterStats.games_played} />
              <StatBox label="G" value={skaterStats.goals} highlight />
              <StatBox label="A" value={skaterStats.assists} highlight />
              <StatBox label="PTS" value={skaterStats.points} highlight primary />
              <StatBox label="PPG" value={skaterStats.points_per_game} decimal />
            </div>
          )}

          {/* Goalie Stats */}
          {goalieStats && goalieStats.games_played > 0 && (
            <>
              {skaterStats && (
                <div className="border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Goaltending
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="GP" value={goalieStats.games_played} />
                <StatBox label="GAA" value={goalieStats.goals_against_average} decimal highlight />
                <StatBox label="SV%" value={goalieStats.save_percentage} percentage primary />
                <StatBox label="SV" value={goalieStats.saves} />
                <StatBox label="SO" value={goalieStats.shutouts} highlight />
                <StatBox label="GA" value={goalieStats.goals_against} />
              </div>
            </>
          )}
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
  decimal?: boolean;
  percentage?: boolean;
}

function StatBox({ label, value, highlight, primary, showSign, decimal, percentage }: StatBoxProps) {
  let displayValue: string;
  if (percentage) {
    displayValue = value >= 1 ? '1.000' : `.${String(Math.round(value * 1000)).padStart(3, '0')}`;
  } else if (decimal) {
    displayValue = value.toFixed(2);
  } else if (showSign && value > 0) {
    displayValue = `+${value}`;
  } else {
    displayValue = String(value);
  }

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
