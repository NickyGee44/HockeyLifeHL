"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target } from "lucide-react";

/**
 * Player Stats Comparison Component
 *
 * Side-by-side comparison of player statistics for a game.
 * Shows goals, assists, points, and penalties for players from both teams.
 *
 * Based on BMHL UI requirements (web-example2.png)
 * Features:
 * - Tabbed view (Scoring, Penalties, Goalies)
 * - Side-by-side team comparison
 * - Clickable player names to player profiles
 * - Highlights for goals/assists
 * - Responsive layout
 */

interface PlayerStat {
  playerId: string;
  playerName: string;
  jerseyNumber?: string;
  goals?: number;
  assists?: number;
  points?: number;
  penaltyMinutes?: number;
  saves?: number;
  shotsAgainst?: number;
  goalsAgainst?: number;
}

interface PlayerStatsComparisonProps {
  homeTeam: {
    id: string;
    name: string;
    players: PlayerStat[];
  };
  awayTeam: {
    id: string;
    name: string;
    players: PlayerStat[];
  };
  statType: "scoring" | "penalties" | "goalies";
  tenantSlug?: string;
}

export function PlayerStatsComparison({
  homeTeam,
  awayTeam,
  statType,
  tenantSlug = "league",
}: PlayerStatsComparisonProps) {
  const renderScoringStats = (player: PlayerStat, isAway: boolean) => {
    const hasStats = (player.goals ?? 0) > 0 || (player.assists ?? 0) > 0;
    if (!hasStats) return null;

    return (
      <div
        key={player.playerId}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors",
          isAway ? "justify-start" : "justify-end flex-row-reverse"
        )}
      >
        <Link
          href={`/${tenantSlug}/players/${player.playerId}`}
          className="flex items-center gap-2 hover:text-[var(--league-primary-color)] transition-colors"
        >
          {player.jerseyNumber && (
            <Badge variant="secondary" className="text-xs">
              #{player.jerseyNumber}
            </Badge>
          )}
          <span className="font-semibold text-sm">{player.playerName}</span>
        </Link>

        <div className="flex items-center gap-2">
          {(player.goals ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Trophy className="h-3 w-3 text-yellow-500" />
              <span className="font-bold text-slate-700">{player.goals}G</span>
            </div>
          )}
          {(player.assists ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Target className="h-3 w-3 text-blue-500" />
              <span className="font-bold text-slate-700">{player.assists}A</span>
            </div>
          )}
          {(player.points ?? 0) > 0 && (
            <span className="text-xs font-semibold text-slate-500">
              ({player.points}P)
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderPenaltyStats = (player: PlayerStat, isAway: boolean) => {
    const hasPenalties = (player.penaltyMinutes ?? 0) > 0;
    if (!hasPenalties) return null;

    return (
      <div
        key={player.playerId}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors",
          isAway ? "justify-start" : "justify-end flex-row-reverse"
        )}
      >
        <Link
          href={`/${tenantSlug}/players/${player.playerId}`}
          className="flex items-center gap-2 hover:text-[var(--league-primary-color)] transition-colors"
        >
          {player.jerseyNumber && (
            <Badge variant="secondary" className="text-xs">
              #{player.jerseyNumber}
            </Badge>
          )}
          <span className="font-semibold text-sm">{player.playerName}</span>
        </Link>

        <Badge variant="destructive" className="text-xs">
          {player.penaltyMinutes} PIM
        </Badge>
      </div>
    );
  };

  const renderGoalieStats = (player: PlayerStat, isAway: boolean) => {
    const hasGoalieStats = (player.saves ?? 0) > 0 || (player.shotsAgainst ?? 0) > 0;
    if (!hasGoalieStats) return null;

    const savePercentage =
      player.saves && player.shotsAgainst && player.shotsAgainst > 0
        ? ((player.saves / player.shotsAgainst) * 100).toFixed(1)
        : "0.0";

    return (
      <div
        key={player.playerId}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors",
          isAway ? "justify-start" : "justify-end flex-row-reverse"
        )}
      >
        <Link
          href={`/${tenantSlug}/players/${player.playerId}`}
          className="flex items-center gap-2 hover:text-[var(--league-primary-color)] transition-colors"
        >
          {player.jerseyNumber && (
            <Badge variant="secondary" className="text-xs">
              #{player.jerseyNumber}
            </Badge>
          )}
          <span className="font-semibold text-sm">{player.playerName}</span>
        </Link>

        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-slate-700">
            {player.saves}/{player.shotsAgainst}
          </span>
          <Badge variant="outline" className="text-xs">
            {savePercentage}%
          </Badge>
          <span className="text-slate-500">
            {player.goalsAgainst} GA
          </span>
        </div>
      </div>
    );
  };

  const renderStats = (player: PlayerStat, isAway: boolean) => {
    switch (statType) {
      case "scoring":
        return renderScoringStats(player, isAway);
      case "penalties":
        return renderPenaltyStats(player, isAway);
      case "goalies":
        return renderGoalieStats(player, isAway);
      default:
        return null;
    }
  };

  const awayTeamFiltered = awayTeam.players.filter((p) => {
    switch (statType) {
      case "scoring":
        return (p.goals ?? 0) > 0 || (p.assists ?? 0) > 0;
      case "penalties":
        return (p.penaltyMinutes ?? 0) > 0;
      case "goalies":
        return (p.saves ?? 0) > 0 || (p.shotsAgainst ?? 0) > 0;
      default:
        return false;
    }
  });

  const homeTeamFiltered = homeTeam.players.filter((p) => {
    switch (statType) {
      case "scoring":
        return (p.goals ?? 0) > 0 || (p.assists ?? 0) > 0;
      case "penalties":
        return (p.penaltyMinutes ?? 0) > 0;
      case "goalies":
        return (p.saves ?? 0) > 0 || (p.shotsAgainst ?? 0) > 0;
      default:
        return false;
    }
  });

  const maxRows = Math.max(awayTeamFiltered.length, homeTeamFiltered.length);

  if (maxRows === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-slate-500">
          No {statType} stats recorded for this game yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border-b border-slate-200">
        <div className="text-center">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {awayTeam.name}
          </h3>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {homeTeam.name}
          </h3>
        </div>
      </div>

      {/* Stats Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: maxRows }).map((_, index) => {
          const awayPlayer = awayTeamFiltered[index];
          const homePlayer = homeTeamFiltered[index];

          return (
            <div key={index} className="grid grid-cols-2 gap-4 p-2">
              <div className="flex items-center justify-start">
                {awayPlayer && renderStats(awayPlayer, true)}
              </div>
              <div className="flex items-center justify-end">
                {homePlayer && renderStats(homePlayer, false)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
