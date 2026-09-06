'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
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
  { key: 'attendance', label: 'Attendance', valueKey: 'attendance_pct', formatter: (value) => `${value ?? 0}%` },
  { key: 'gpg', label: 'GPG', valueKey: 'goals_per_game', formatter: (value) => formatDecimal(value, 2) },
  { key: 'ppg', label: 'PPG', valueKey: 'points_per_game', formatter: (value) => formatDecimal(value, 2) },
];

const goalieMetrics: MetricConfig[] = [
  { key: 'wins', label: 'Wins', valueKey: 'wins' },
  { key: 'savePct', label: 'SV%', valueKey: 'save_percentage', formatter: (value) => `${formatDecimal(value, 1)}%` },
  { key: 'gaa', label: 'GAA', valueKey: 'goals_against_average', formatter: (value) => formatDecimal(value, 2) },
  { key: 'saves', label: 'Saves', valueKey: 'saves' },
  { key: 'shutouts', label: 'Shutouts', valueKey: 'shutouts' },
  { key: 'attendance', label: 'Attendance', valueKey: 'attendance_pct', formatter: (value) => `${value ?? 0}%` },
];

export function PlayerCareerStatsSection({
  seasons,
  isGoalie,
  hotFacts,
}: {
  seasons: PlayerCareerSeasonRow[];
  isGoalie: boolean;
  hotFacts: string[];
}) {
  const metrics = isGoalie ? goalieMetrics : skaterMetrics;
  const [selectedMetric, setSelectedMetric] = useState(metrics[0]?.key ?? 'goals');
  const [activeHotFactIndex, setActiveHotFactIndex] = useState(0);
  const activeMetric = metrics.find((metric) => metric.key === selectedMetric) ?? metrics[0];
  const boundedHotFacts = hotFacts.slice(0, 5);
  const activeHotFact = boundedHotFacts[activeHotFactIndex] ?? boundedHotFacts[0] ?? '';

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
    <section className="glass-card-strong mb-6 rounded-[28px] p-5 md:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--league-primary)]" />
            <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Career Stats</h2>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">Flat career trendline by season.</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {metrics.map((metric) => {
          const active = metric.key === activeMetric.key;
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => setSelectedMetric(metric.key)}
              className={`glass-control min-h-11 rounded-full border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--league-primary)] ${
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

      <div className="glass-card h-64 w-full rounded-2xl p-3">
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

      {boundedHotFacts.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--color-border)]/70 px-3 py-2.5">
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--league-primary)]" />
          <button
            type="button"
            onClick={() => setActiveHotFactIndex((current) => (current - 1 + boundedHotFacts.length) % boundedHotFacts.length)}
            className="glass-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
            aria-label="Previous hot take"
            disabled={boundedHotFacts.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text-primary)]">{activeHotFact}</p>
          <button
            type="button"
            onClick={() => setActiveHotFactIndex((current) => (current + 1) % boundedHotFacts.length)}
            className="glass-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
            aria-label="Next hot take"
            disabled={boundedHotFacts.length <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}

function formatDecimal(value: number | null | undefined, digits = 2) {
  const safe = Number(value ?? 0);
  return safe.toFixed(digits).replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1');
}
