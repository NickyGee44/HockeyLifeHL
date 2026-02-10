'use client';

import { useState, useTransition } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import {
  updateSeasonEligibilitySettings,
  updateGamesPlayedOverride,
} from '@/lib/actions/playoff-eligibility';

interface EligibilityPlayer {
  player_id: string;
  team_id: string;
  full_name: string | null;
  jersey_number: number | null;
  games_played: number;
  total_team_games: number;
  games_played_pct: number;
  is_eligible: boolean;
  min_games_pct: number | null;
  min_games: number | null;
}

interface RosterEntry {
  id: string;
  player_id: string;
  team_id: string;
  games_played_override: number | null;
}

interface Team {
  id: string;
  name: string;
  short_name: string | null;
}

interface EligibilityDashboardProps {
  seasonId: string;
  seasonName: string;
  minGamesPct: number | null;
  minGames: number | null;
  eligibility: EligibilityPlayer[];
  teams: Team[];
  rosters: RosterEntry[];
}

export function EligibilityDashboard({
  seasonId,
  seasonName,
  minGamesPct: initialMinPct,
  minGames: initialMinGames,
  eligibility,
  teams,
  rosters,
}: EligibilityDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedTeam, setSelectedTeam] = useState<string | 'all'>('all');
  const [minPct, setMinPct] = useState<string>(initialMinPct?.toString() ?? '');
  const [minGames, setMinGames] = useState<string>(initialMinGames?.toString() ?? '');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [overrideValues, setOverrideValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    rosters.forEach((r) => {
      if (r.games_played_override !== null) {
        const key = `${r.player_id}-${r.team_id}`;
        initial[key] = r.games_played_override.toString();
      }
    });
    return initial;
  });

  const filteredPlayers =
    selectedTeam === 'all'
      ? eligibility
      : eligibility.filter((p) => p.team_id === selectedTeam);

  const eligibleCount = filteredPlayers.filter((p) => p.is_eligible).length;
  const ineligibleCount = filteredPlayers.length - eligibleCount;

  // Group players by team
  const teamGroups = new Map<string, EligibilityPlayer[]>();
  filteredPlayers.forEach((p) => {
    const group = teamGroups.get(p.team_id) ?? [];
    group.push(p);
    teamGroups.set(p.team_id, group);
  });

  const handleSaveSettings = () => {
    setSettingsMessage(null);
    startTransition(async () => {
      const pct = minPct ? parseFloat(minPct) : null;
      const games = minGames ? parseInt(minGames, 10) : null;
      const result = await updateSeasonEligibilitySettings(seasonId, pct, games);
      if (result.success) {
        setSettingsMessage('Settings saved. Reload to see updated eligibility.');
      } else {
        setSettingsMessage(`Error: ${result.error}`);
      }
    });
  };

  const handleSaveOverride = (playerId: string, teamId: string) => {
    const key = `${playerId}-${teamId}`;
    const value = overrideValues[key];
    const roster = rosters.find((r) => r.player_id === playerId && r.team_id === teamId);
    if (!roster) return;

    startTransition(async () => {
      const override = value ? parseInt(value, 10) : null;
      const result = await updateGamesPlayedOverride(roster.id, override);
      if (!result.success) {
        setSettingsMessage(`Error saving override: ${result.error}`);
      }
    });
  };

  const teamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.short_name || team?.name || 'Unknown Team';
  };

  const hasRules = initialMinPct !== null || initialMinGames !== null;

  return (
    <div className="space-y-6">
      {/* Settings Panel */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" />
          Eligibility Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum Games Played (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={minPct}
              onChange={(e) => setMinPct(e.target.value)}
              placeholder="e.g. 60"
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of team games a player must play
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum Games (Absolute)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={minGames}
              onChange={(e) => setMinGames(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Hard minimum regardless of percentage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={handleSaveSettings}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </button>
          {settingsMessage && (
            <p className={`text-sm ${settingsMessage.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
              {settingsMessage}
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      {hasRules && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Players</p>
            <p className="text-2xl font-bold">{filteredPlayers.length}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Eligible</p>
            <p className="text-2xl font-bold text-green-600">{eligibleCount}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Ineligible</p>
            <p className="text-2xl font-bold text-red-600">{ineligibleCount}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Teams</p>
            <p className="text-2xl font-bold">{teamGroups.size}</p>
          </div>
        </div>
      )}

      {/* Team Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Filter by team:</label>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* No rules warning */}
      {!hasRules && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              No eligibility rules configured
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Set a minimum games percentage or absolute minimum above, then save to enable eligibility tracking.
            </p>
          </div>
        </div>
      )}

      {/* Teams & Players */}
      {Array.from(teamGroups.entries()).map(([tId, players]) => (
        <div
          key={tId}
          className="bg-card border rounded-lg overflow-hidden"
        >
          <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {teamName(tId)}
            </h3>
            <span className="text-sm text-muted-foreground">
              {players.filter((p) => p.is_eligible).length} / {players.length} eligible
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Player
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">
                    #
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">
                    GP
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">
                    %
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">
                    Eligible
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">
                    GP Override
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {players.map((player) => {
                  const key = `${player.player_id}-${player.team_id}`;
                  return (
                    <tr key={key} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-medium">
                        {player.full_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-2 text-center font-mono text-muted-foreground">
                        {player.jersey_number ?? '-'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {player.games_played} / {player.total_team_games}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {player.games_played_pct}%
                      </td>
                      <td className="px-4 py-2 text-center">
                        {player.is_eligible ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={200}
                            value={overrideValues[key] ?? ''}
                            onChange={(e) =>
                              setOverrideValues((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder="-"
                            className="w-16 px-2 py-1 text-center text-sm border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            onClick={() => handleSaveOverride(player.player_id, player.team_id)}
                            disabled={isPending}
                            className="p-1 text-primary hover:bg-primary/10 rounded disabled:opacity-50"
                            title="Save override"
                          >
                            {isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
