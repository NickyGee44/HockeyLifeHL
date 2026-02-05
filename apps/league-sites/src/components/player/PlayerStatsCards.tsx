import type { PlayerStats } from '@/lib/types';

interface PlayerStatsCardsProps {
  stats: PlayerStats;
  isGoalie?: boolean;
}

export function PlayerStatsCards({ stats, isGoalie = false }: PlayerStatsCardsProps) {
  if (isGoalie) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="GP" value={stats.games_played} />
        <StatCard label="W" value={stats.wins ?? 0} highlight />
        <StatCard label="L" value={stats.losses ?? 0} />
        <StatCard
          label="GAA"
          value={stats.goals_against_average?.toFixed(2) ?? '0.00'}
        />
        <StatCard
          label="SV%"
          value={stats.save_percentage ? `.${Math.round(stats.save_percentage * 1000)}` : '.000'}
          highlight
        />
        <StatCard label="SO" value={0} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <StatCard label="GP" value={stats.games_played} />
      <StatCard label="G" value={stats.goals} highlight />
      <StatCard label="A" value={stats.assists} />
      <StatCard label="PTS" value={stats.points} highlight />
      <StatCard label="PIM" value={stats.penalty_minutes} />
      <StatCard
        label="+/-"
        value={stats.plus_minus >= 0 ? `+${stats.plus_minus}` : stats.plus_minus.toString()}
        variant={stats.plus_minus > 0 ? 'positive' : stats.plus_minus < 0 ? 'negative' : 'neutral'}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  variant?: 'positive' | 'negative' | 'neutral';
}

function StatCard({ label, value, highlight, variant }: StatCardProps) {
  const getValueColor = () => {
    if (variant === 'positive') return 'text-green-400';
    if (variant === 'negative') return 'text-red-400';
    if (highlight) return 'text-[var(--league-primary)]';
    return 'text-[var(--color-text-primary)]';
  };

  return (
    <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-4 text-center hover:border-[var(--league-primary)]/30 transition-colors">
      <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold ${getValueColor()}`}>{value}</div>
    </div>
  );
}
