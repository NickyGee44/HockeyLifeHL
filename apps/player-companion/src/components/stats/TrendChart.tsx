'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from 'recharts';
import { cn } from '@hockey-life/ui';

interface GamePointData {
  game: string;
  points: number;
  opponent?: string;
}

interface TrendChartProps {
  data: GamePointData[];
  className?: string;
}

export function TrendChart({ data, className }: TrendChartProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-neutral-850 border border-gold-500/20 p-4',
        className
      )}
    >
      <span className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
        Points by Game
      </span>
      <div className="h-[160px] mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="game"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#737373', fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#737373', fontSize: 10 }}
              width={30}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="points"
              stroke="#D4AF37"
              strokeWidth={2}
              dot={{ fill: '#D4AF37', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#D4AF37' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as GamePointData;

  return (
    <div className="bg-neutral-900 border border-gold-500/30 rounded-lg p-2 shadow-lg">
      <p className="text-xs text-neutral-400">{data.opponent || `Game ${data.game}`}</p>
      <p className="text-sm font-bold text-gold-400">{data.points} pts</p>
    </div>
  );
}

// Simple sparkline for compact display
interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

export function Sparkline({ data, color = '#D4AF37', className }: SparklineProps) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className={cn('w-full h-full', className)} viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
