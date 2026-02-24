'use client';

import { useState } from 'react';
import type { DivisionBalanceResult } from '@/lib/ratings';

interface DivisionBalanceDashboardProps {
  balance: DivisionBalanceResult;
}

export function DivisionBalanceDashboard({ balance }: DivisionBalanceDashboardProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  return (
    <div className="space-y-5">
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-400">Balance Score</p>
          <p className="text-2xl font-bold text-white">{balance.balanceScore.toFixed(1)} / 100</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {balance.divisions.map((division) => (
          <div key={division.divisionId || 'unassigned'} className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{division.divisionName}</h3>
              <span className="text-xs text-neutral-400">μ {division.mean.toFixed(1)} | σ {division.stdDev.toFixed(1)}</span>
            </div>
            <div className="space-y-2">
              {division.teams.map((team) => (
                <div key={team.teamId} className="flex items-center justify-between text-sm border border-white/5 rounded px-3 py-2">
                  <span className="text-neutral-200">{team.teamName}</span>
                  <div className="flex items-center gap-2">
                    {team.flag && (
                      <span className={`text-xs font-semibold ${team.flag === 'above' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {team.flag === 'above' ? 'ABOVE' : 'BELOW'}
                      </span>
                    )}
                    <span className="text-neutral-300">{team.overallPercentile.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3">Recommendations</h3>
        {balance.recommendations.filter((rec) => !dismissedIds.has(rec.teamId)).length === 0 ? (
          <p className="text-sm text-neutral-400">No active recommendations.</p>
        ) : (
          <div className="space-y-3">
            {balance.recommendations
              .filter((rec) => !dismissedIds.has(rec.teamId))
              .map((rec) => (
                <div key={rec.teamId} className="border border-white/10 rounded-lg p-3">
                  <p className="text-sm text-white">
                    {rec.teamName}: move from <span className="text-neutral-400">{rec.fromDivisionName}</span> to{' '}
                    <span className="text-neutral-200">{rec.toDivisionName}</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">{rec.reason}</p>
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">Accept</button>
                    <button
                      className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 text-xs"
                      onClick={() => setDismissedIds((prev) => new Set(prev).add(rec.teamId))}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
