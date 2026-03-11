'use client';

import { useEffect, useState } from 'react';
import { getPlayerDetail } from '@/lib/actions/ratings';
import { PLAYER_BREAKDOWN_METRIC_HELP } from '@/lib/ratings';

interface PlayerDetailPanelProps {
  open: boolean;
  playerId: string | null;
  leagueId: string;
  onClose: () => void;
}

export function PlayerDetailPanel({ open, playerId, leagueId, onClose }: PlayerDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getPlayerDetail>>['data']>(undefined);

  useEffect(() => {
    if (!open || !playerId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getPlayerDetail(playerId, leagueId)
      .then((result) => setDetail(result.success ? result.data : undefined))
      .finally(() => setLoading(false));
  }, [open, playerId, leagueId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
      <div className="w-full max-w-xl h-full bg-neutral-950 border-l border-white/10 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Player Detail</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">Close</button>
        </div>

        {loading && <p className="text-neutral-400">Loading…</p>}

        {!loading && !detail && (
          <p className="text-neutral-400">No detail available.</p>
        )}

        {!loading && detail && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-neutral-500">Player</p>
              <p className="text-xl text-white font-semibold">{detail.name}</p>
            </div>

            {detail.latestBreakdown && detail.latestBreakdown.length > 0 && (
              <div>
                <p className="text-sm text-neutral-500 mb-2">Latest Rating Breakdown</p>
                <div className="space-y-2">
                  {detail.latestBreakdown.map((metric) => (
                    <div
                      key={metric.key}
                      className="flex items-center justify-between gap-4 rounded border border-white/10 px-3 py-2 text-sm"
                    >
                      <div className="space-y-1">
                        <p className="text-white">{metric.label}</p>
                        {PLAYER_BREAKDOWN_METRIC_HELP[metric.key] ? (
                          <p className="text-xs leading-5 text-neutral-500">
                            {PLAYER_BREAKDOWN_METRIC_HELP[metric.key].description}
                          </p>
                        ) : null}
                        <p className="text-xs text-neutral-500">
                          {metric.appliedWeight.toFixed(1)}% of active rating weight
                          {PLAYER_BREAKDOWN_METRIC_HELP[metric.key]
                            ? ` • ${PLAYER_BREAKDOWN_METRIC_HELP[metric.key].sway}`
                            : ''}
                        </p>
                      </div>
                      <p className="font-semibold text-rink-400">{metric.normalizedScore.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-neutral-500 mb-2">Rating History</p>
              <div className="space-y-2">
                {detail.ratingsHistory.map((row) => (
                  <div key={`${row.seasonId}-${row.calculatedAt}`} className="border border-white/10 rounded px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white">{row.seasonName}</span>
                      <span className="text-rink-400 font-semibold">{row.grade}</span>
                    </div>
                    <div className="text-neutral-400 text-xs mt-1">
                      {row.overallPercentile.toFixed(1)} percentile, {row.gamesPlayed} GP
                      {typeof row.confidenceScore === 'number' ? `, ${row.confidenceScore.toFixed(0)} confidence` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-neutral-500 mb-2">Division History</p>
              <div className="space-y-2">
                {detail.teamHistory.map((row, idx) => (
                  <div key={`${row.seasonId}-${row.teamName}-${idx}`} className="border border-white/10 rounded px-3 py-2 text-sm text-neutral-300">
                    {row.seasonId}: {row.teamName} ({row.divisionName})
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
