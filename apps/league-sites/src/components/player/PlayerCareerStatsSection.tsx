'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PlayerCareerSeasonRow } from '@/lib/data';

type MetricConfig = {
  key: string;
  label: string;
  valueKey: keyof PlayerCareerSeasonRow;
  formatter?: (value: number | null) => string;
};

const skaterMetrics: MetricConfig[] = [
  { key: 'goals', label: 'Goals', valueKey: 'goals' },
  { key: 'assists', label: 'Assists', valueKey: 'assists' },
  { key: 'points', label: 'Points', valueKey: 'points' },
  { key: 'attendance', label: 'Attendance %', valueKey: 'attendance_pct', formatter: (value) => `${value ?? 0}%` },
  { key: 'gpg', label: 'GPG', valueKey: 'goals_per_game', formatter: (value) => formatDecimal(value, 2) },
  { key: 'ppg', label: 'PPG', valueKey: 'points_per_game', formatter: (value) => formatDecimal(value, 2) },
];

const goalieMetrics: MetricConfig[] = [
  { key: 'wins', label: 'Wins', valueKey: 'wins' },
  { key: 'savePct', label: 'SV%', valueKey: 'save_percentage', formatter: (value) => `${formatDecimal(value, 1)}%` },
  { key: 'gaa', label: 'GAA', valueKey: 'goals_against_average', formatter: (value) => formatDecimal(value, 2) },
  { key: 'saves', label: 'Saves', valueKey: 'saves' },
  { key: 'shutouts', label: 'Shutouts', valueKey: 'shutouts' },
  { key: 'attendance', label: 'Attendance %', valueKey: 'attendance_pct', formatter: (value) => `${value ?? 0}%` },
];

export function PlayerCareerStatsSection({
  seasons,
  isGoalie,
  hotFact,
}: {
  seasons: PlayerCareerSeasonRow[];
  isGoalie: boolean;
  hotFact: string;
}) {
  const metrics = isGoalie ? goalieMetrics : skaterMetrics;
  const [selectedMetric, setSelectedMetric] = useState(metrics[0]?.key ?? 'goals');
  const activeMetric = metrics.find((metric) => metric.key === selectedMetric) ?? metrics[0];

  const chartData = useMemo(
    () =>
      seasons.map((season) => ({
        season: season.season_name,
        value: Number(season[activeMetric.valueKey] ?? 0),
      })),
    [activeMetric, seasons],
  );

  if (seasons.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="mb-3">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Career Stats</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">Flat career trendline by season.</p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {metrics.map((metric) => {
          const active = metric.key === activeMetric.key;
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => setSelectedMetric(metric.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/12 text-[var(--league-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--league-primary)]/40 hover:text-[var(--color-text-primary)]'
              }`}
            >
              {metric.label}
            </button>
          );
        })}
      </div>

      <div className="h-64 w-full rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-background-elevated)]/55 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="careerStatsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--league-primary)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--league-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.25} vertical={false} />
            <XAxis dataKey="season" tickLine={false} axisLine={false} minTickGap={18} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} width={42} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
            <Tooltip
              cursor={{ stroke: 'var(--league-primary)', strokeOpacity: 0.25 }}
              contentStyle={{
                borderRadius: 14,
                border: '1px solid var(--color-border)',
                background: 'var(--color-background-elevated)',
                color: 'var(--color-text-primary)',
              }}
              formatter={(value: number) => [activeMetric.formatter ? activeMetric.formatter(value) : String(value), activeMetric.label]}
            />
            <Area type="monotone" dataKey="value" stroke="var(--league-primary)" strokeWidth={3} fill="url(#careerStatsFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        {seasons.map((season) => {
          const metricValue = season[activeMetric.valueKey] as number | null;
          return (
            <div key={`${season.season_id}-${season.team_id ?? 'team'}`} className="rounded-2xl border border-[var(--color-border)]/70 px-3 py-2">
              <div className="truncate text-xs font-semibold text-[var(--color-text-secondary)]">{season.season_name}</div>
              <div className="mt-1 text-base font-bold text-[var(--color-text-primary)]">
                {activeMetric.formatter ? activeMetric.formatter(metricValue ?? 0) : metricValue ?? 0}
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">GP {season.games_played}{season.team_games > 0 ? ` · Team ${season.team_games}` : ''}</div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-sm font-medium text-[var(--color-text-primary)]">{hotFact}</p>
    </section>
  );
}

function formatDecimal(value: number | null | undefined, digits = 2) {
  const safe = Number(value ?? 0);
  return safe.toFixed(digits).replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1');
}
