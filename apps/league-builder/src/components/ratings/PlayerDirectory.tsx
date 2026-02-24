'use client';

import { useMemo, useState } from 'react';
import { PlayerDetailPanel } from './PlayerDetailPanel';

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
              <th className="text-left p-3">Grade</th>
              <th className="text-right p-3">GP</th>
              <th className="text-right p-3">Pts</th>
              <th className="text-right p-3">+/-</th>
              <th className="text-right p-3">Overall %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.playerId}
                className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer"
                onClick={() => setSelectedPlayerId(row.playerId)}
              >
                <td className="p-3 text-white">{row.name}</td>
                <td className="p-3 text-neutral-300">{row.teamName}</td>
                <td className="p-3 text-neutral-300">{row.divisionName}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded bg-rink-500/20 text-rink-400 text-xs font-semibold">{row.grade}</span>
                </td>
                <td className="p-3 text-right text-neutral-300">{row.gamesPlayed}</td>
                <td className="p-3 text-right text-neutral-300">{row.points}</td>
                <td className="p-3 text-right text-neutral-300">{row.plusMinus}</td>
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
