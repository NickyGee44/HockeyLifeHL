"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Game Row Component
 *
 * Displays a single game in the schedule list.
 * Shows teams, time, score, venue, division, and status.
 *
 * Based on BMHL UI requirements (web-example1.png)
 * Features:
 * - Clickable row linking to game detail page
 * - Displays team names and logos
 * - Shows game time or final score
 * - Venue and division badges
 * - Status indicators (Live, Final, Scheduled, Postponed, Cancelled)
 * - Hover effect for better UX
 */

type GameStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";

interface GameRowProps {
  gameId: string;
  homeTeam: {
    id: string;
    name: string;
    logoUrl?: string;
    score?: number;
  };
  awayTeam: {
    id: string;
    name: string;
    logoUrl?: string;
    score?: number;
  };
  scheduledAt: Date;
  status: GameStatus;
  venue?: {
    id: string;
    name: string;
  };
  division?: {
    id: string;
    name: string;
  };
  tenantSlug?: string; // For building the game detail URL
}

export function GameRow({
  gameId,
  homeTeam,
  awayTeam,
  scheduledAt,
  status,
  venue,
  division,
  tenantSlug = "league",
}: GameRowProps) {
  const isCompleted = status === "completed";
  const isLive = status === "in_progress";
  const isCancelled = status === "cancelled";
  const isPostponed = status === "postponed";

  const gameDetailUrl = tenantSlug
    ? `/${tenantSlug}/games/${gameId}`
    : `/games/${gameId}`;

  return (
    <Link
      href={gameDetailUrl}
      className="block bg-white border border-slate-200 rounded-lg hover:border-[var(--league-primary-color)] hover:shadow-md transition-all duration-200"
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section: Time/Status */}
          <div className="flex flex-col items-center justify-center min-w-[80px] shrink-0">
            {isLive && (
              <Badge className="bg-red-500 text-white mb-2 animate-pulse">
                LIVE
              </Badge>
            )}
            {isCompleted ? (
              <span className="text-sm font-semibold text-slate-500">FINAL</span>
            ) : isCancelled ? (
              <Badge variant="destructive" className="mb-2">
                CANCELLED
              </Badge>
            ) : isPostponed ? (
              <Badge variant="secondary" className="mb-2">
                POSTPONED
              </Badge>
            ) : (
              <>
                <div className="flex items-center gap-1 text-slate-600">
                  <Clock className="h-3 w-3" />
                  <span className="text-sm font-semibold">
                    {format(scheduledAt, "h:mm a")}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Middle Section: Teams and Score */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Away Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-semibold text-slate-500 w-10 text-right">
                  AWAY
                </span>
                {awayTeam.logoUrl && (
                  <img
                    src={awayTeam.logoUrl}
                    alt={awayTeam.name}
                    className="h-8 w-8 object-contain"
                  />
                )}
                <span
                  className={cn(
                    "text-base font-semibold flex-1",
                    isCompleted &&
                      awayTeam.score !== undefined &&
                      homeTeam.score !== undefined &&
                      awayTeam.score > homeTeam.score
                      ? "text-[var(--league-primary-color)]"
                      : "text-slate-900"
                  )}
                >
                  {awayTeam.name}
                </span>
              </div>
              {(isCompleted || isLive) && awayTeam.score !== undefined && (
                <span
                  className={cn(
                    "text-2xl font-bold min-w-[40px] text-right",
                    isCompleted &&
                      awayTeam.score > (homeTeam.score ?? 0)
                      ? "text-[var(--league-primary-color)]"
                      : "text-slate-700"
                  )}
                >
                  {awayTeam.score}
                </span>
              )}
            </div>

            {/* Home Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-semibold text-slate-500 w-10 text-right">
                  HOME
                </span>
                {homeTeam.logoUrl && (
                  <img
                    src={homeTeam.logoUrl}
                    alt={homeTeam.name}
                    className="h-8 w-8 object-contain"
                  />
                )}
                <span
                  className={cn(
                    "text-base font-semibold flex-1",
                    isCompleted &&
                      homeTeam.score !== undefined &&
                      awayTeam.score !== undefined &&
                      homeTeam.score > awayTeam.score
                      ? "text-[var(--league-primary-color)]"
                      : "text-slate-900"
                  )}
                >
                  {homeTeam.name}
                </span>
              </div>
              {(isCompleted || isLive) && homeTeam.score !== undefined && (
                <span
                  className={cn(
                    "text-2xl font-bold min-w-[40px] text-right",
                    isCompleted &&
                      homeTeam.score > (awayTeam.score ?? 0)
                      ? "text-[var(--league-primary-color)]"
                      : "text-slate-700"
                  )}
                >
                  {homeTeam.score}
                </span>
              )}
            </div>
          </div>

          {/* Right Section: Metadata */}
          <div className="flex flex-col items-end gap-2 min-w-[150px] shrink-0">
            {division && (
              <Badge variant="secondary" className="text-xs">
                {division.name}
              </Badge>
            )}
            {venue && (
              <div className="flex items-center gap-1 text-slate-600">
                <MapPin className="h-3 w-3" />
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {venue.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
