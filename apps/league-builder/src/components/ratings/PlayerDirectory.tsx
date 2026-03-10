'use client';

import { useMemo, useState } from 'react';
import { PlayerDetailPanel } from './PlayerDetailPanel';
import { RatingsHelpTooltip } from './RatingsHelpTooltip';
import { PLAYER_TABLE_COLUMN_HELP } from '@/lib/ratings';

type PlayerRow = {
  playerId: string;
  name: string;
  teamId: string | null;
  teamName: string;
  divisionId: string | null;
  divisionName: string;
  position: 'skater' | 'goalie';
  grade: string;
  overallPercentile: number;
  rawPercentile: number;
  gamesPlayed: number;
  points: number;
  plusMinus: number;
  trend: 'up' | 'down' | 'flat';
  savePct: number | null;
  gaa: number | null;
  wins: number | null;
  shutouts: number | null;
};

interface PlayerDirectoryProps {
  leagueId: string;
  rows: PlayerRow[];
}

export function PlayerDirectory({ leagueId, rows }: PlayerDirectoryProps) {
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('all');
  const [position, setPosition] = useState<'all' | 'skater' | 'goalie'>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const divisions = useMemo(
    () => [...new Set(rows.map((row) => row.divisionName).filter(Boolean))],
    [rows]
  );

  const filtered = useMemo(() => {
    return rows
      .filter((row) => row.name.toLowerCase().includes(search.toLowerCase()))
      .filter((row) => (division === 'all' ? true : row.divisionName === division))
      .filter((row) => (position === 'all' ? true : row.position === position))
      .sort((a, b) => b.overallPercentile - a.overallPercentile);
  }, [rows, search, division, position]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="px-3 py-2 bg-neutral-900 border border-white/10 rounded text-sm text-white"
          placeholder="Search player"
        />
        <select
          value={division}
          onChange={(event) => setDivision(event.target.value)}
          className="px-3 py-2 bg-neutral-900 border border-white/10 rounded text-sm text-white"
        >
          <option value="all">All divisions</option>
          {divisions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          value={position}
          onChange={(event) => setPosition(event.target.value as 'all' | 'skater' | 'goalie')}
          className="px-3 py-2 bg-neutral-900 border border-white/10 rounded text-sm text-white"
        >
          <option value="all">All positions</option>
          <option value="skater">Skaters</option>
          <option value="goalie">Goalies</option>
        </select>
      </div>

      <div className="overflow-auto border border-white/10 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/70 text-neutral-400">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">Division</th>
              <th className="p-3 text-left">
                <div className="flex items-center gap-1">
                  Grade
                  <RatingsHelpTooltip label="Grade" description={PLAYER_TABLE_COLUMN_HELP.grade} />
                </div>
              </th>
              <th className="p-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  GP
                  <RatingsHelpTooltip label="Games played" description={PLAYER_TABLE_COLUMN_HELP.gp} />
                </div>
              </th>
              <th className="p-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  Pts
                  <RatingsHelpTooltip label="Points" description={PLAYER_TABLE_COLUMN_HELP.pts} />
                </div>
              </th>
              <th className="p-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  +/-
                  <RatingsHelpTooltip label="Plus/minus" description={PLAYER_TABLE_COLUMN_HELP.plusMinus} />
                </div>
              </th>
              <th className="p-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  SV%
                  <RatingsHelpTooltip label="Save percentage" description={PLAYER_TABLE_COLUMN_HELP.savePct} />
                </div>
              </th>
              <th className="p-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  GAA
                  <RatingsHelpTooltip label="Goals against average" description={PLAYER_TABLE_COLUMN_HELP.gaa} />
                </div>
              </th>
              <th className="p-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  Overall %
                  <RatingsHelpTooltip label="Overall percentile" description={PLAYER_TABLE_COLUMN_HELP.overall} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.playerId}
                className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer"
                onClick={() => setSelectedPlayerId(row.playerId)}
              >
                <td className="p-3 text-white">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        row.position === 'goalie'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-sky-500/20 text-sky-400'
                      }`}
                    >
                      {row.position === 'goalie' ? 'G' : 'S'}
                    </span>
                    {row.name}
                  </div>
                </td>
                <td className="p-3 text-neutral-300">{row.teamName}</td>
                <td className="p-3 text-neutral-300">{row.divisionName}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded bg-rink-500/20 text-rink-400 text-xs font-semibold">{row.grade}</span>
                </td>
                <td className="p-3 text-right text-neutral-300">{row.gamesPlayed}</td>
                <td className="p-3 text-right text-neutral-300">
                  {row.position === 'skater' ? row.points : <span className="text-neutral-600">—</span>}
                </td>
                <td className="p-3 text-right text-neutral-300">
                  {row.position === 'skater' ? (
                    <span className={row.plusMinus > 0 ? 'text-green-400' : row.plusMinus < 0 ? 'text-red-400' : ''}>
                      {row.plusMinus > 0 ? '+' : ''}{row.plusMinus}
                    </span>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
                <td className="p-3 text-right text-neutral-300">
                  {row.savePct !== null ? row.savePct.toFixed(3) : <span className="text-neutral-600">—</span>}
                </td>
                <td className="p-3 text-right text-neutral-300">
                  {row.gaa !== null ? row.gaa.toFixed(2) : <span className="text-neutral-600">—</span>}
                </td>
                <td className="p-3 text-right text-white">{row.overallPercentile.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlayerDetailPanel
        open={selectedPlayerId !== null}
        playerId={selectedPlayerId}
        leagueId={leagueId}
        onClose={() => setSelectedPlayerId(null)}
      />
    </div>
  );
}
