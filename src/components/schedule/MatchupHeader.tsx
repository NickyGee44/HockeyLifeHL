"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Matchup Header Component
 *
 * Hero section for game detail page showing:
 * - Team logos, names, and records
 * - Current/final score
 * - Game status (Live, Final, Scheduled)
 * - Game metadata (date, time, venue, division)
 *
 * Based on BMHL UI requirements (web-example2.png)
 * Features:
 * - Large team logos and names
 * - Prominent score display
 * - Live game indicator
 * - Clickable team names to team pages
 * - Responsive layout
 */

type GameStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";

interface MatchupHeaderProps {
  homeTeam: {
    id: string;
    name: string;
    logoUrl?: string;
    record?: {
      wins: number;
      losses: number;
      ties?: number;
    };
    score?: number;
  };
  awayTeam: {
    id: string;
    name: string;
    logoUrl?: string;
    record?: {
      wins: number;
      losses: number;
      ties?: number;
    };
    score?: number;
  };
  scheduledAt: Date;
  status: GameStatus;
  venue?: {
    id: string;
    name: string;
    address?: string;
  };
  division?: {
    id: string;
    name: string;
  };
  period?: string; // "1st", "2nd", "3rd", "OT", "SO", "Final"
  timeRemaining?: string; // "12:34" for live games
  tenantSlug?: string;
}

export function MatchupHeader({
  homeTeam,
  awayTeam,
  scheduledAt,
  status,
  venue,
  division,
  period,
  timeRemaining,
  tenantSlug = "league",
}: MatchupHeaderProps) {
  const isCompleted = status === "completed";
  const isLive = status === "in_progress";
  const isCancelled = status === "cancelled";
  const isPostponed = status === "postponed";

  const formatRecord = (record?: { wins: number; losses: number; ties?: number }) => {
    if (!record) return "";
    return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
  };

  const awayTeamWon = isCompleted && (awayTeam.score ?? 0) > (homeTeam.score ?? 0);
  const homeTeamWon = isCompleted && (homeTeam.score ?? 0) > (awayTeam.score ?? 0);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200">
      <div className="container mx-auto px-4 py-8">
        {/* Status Bar */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {isLive && (
            <>
              <Badge className="bg-red-500 text-white animate-pulse text-sm px-4 py-1">
                LIVE
              </Badge>
              {period && (
                <span className="text-lg font-bold text-slate-700">
                  {period}
                  {timeRemaining && ` • ${timeRemaining}`}
                </span>
              )}
            </>
          )}
          {isCompleted && (
            <Badge className="bg-slate-700 text-white text-sm px-4 py-1">
              FINAL {period && period !== "3rd" ? `• ${period}` : ""}
            </Badge>
          )}
          {isCancelled && (
            <Badge variant="destructive" className="text-sm px-4 py-1">
              GAME CANCELLED
            </Badge>
          )}
          {isPostponed && (
            <Badge variant="secondary" className="text-sm px-4 py-1">
              GAME POSTPONED
            </Badge>
          )}
        </div>

        {/* Matchup */}
        <div className="flex items-center justify-center gap-8 lg:gap-16">
          {/* Away Team */}
          <div className="flex flex-col items-center gap-3 flex-1 max-w-xs">
            <Link
              href={`/${tenantSlug}/teams/${awayTeam.id}`}
              className="group transition-transform hover:scale-105"
            >
              {awayTeam.logoUrl ? (
                <img
                  src={awayTeam.logoUrl}
                  alt={awayTeam.name}
                  className="h-24 w-24 lg:h-32 lg:w-32 object-contain"
                />
              ) : (
                <div className="h-24 w-24 lg:h-32 lg:w-32 bg-slate-200 rounded-full flex items-center justify-center">
                  <Users className="h-12 w-12 lg:h-16 lg:w-16 text-slate-400" />
                </div>
              )}
            </Link>
            <Link
              href={`/${tenantSlug}/teams/${awayTeam.id}`}
              className="text-center group"
            >
              <h2
                className={cn(
                  "text-xl lg:text-2xl font-bold group-hover:text-[var(--league-primary-color)] transition-colors",
                  awayTeamWon ? "text-[var(--league-primary-color)]" : "text-slate-900"
                )}
              >
                {awayTeam.name}
              </h2>
              {awayTeam.record && (
                <p className="text-sm text-slate-500 mt-1">
                  {formatRecord(awayTeam.record)}
                </p>
              )}
            </Link>
          </div>

          {/* Score/Time */}
          <div className="flex flex-col items-center gap-2 min-w-[120px]">
            {(isCompleted || isLive) && awayTeam.score !== undefined && homeTeam.score !== undefined ? (
              <>
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "text-5xl lg:text-6xl font-bold",
                      awayTeamWon ? "text-[var(--league-primary-color)]" : "text-slate-700"
                    )}
                  >
                    {awayTeam.score}
                  </span>
                  <span className="text-3xl lg:text-4xl font-light text-slate-400">-</span>
                  <span
                    className={cn(
                      "text-5xl lg:text-6xl font-bold",
                      homeTeamWon ? "text-[var(--league-primary-color)]" : "text-slate-700"
                    )}
                  >
                    {homeTeam.score}
                  </span>
                </div>
              </>
            ) : !isCancelled && !isPostponed ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  {format(scheduledAt, "EEEE")}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {format(scheduledAt, "h:mm a")}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {format(scheduledAt, "MMM d, yyyy")}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-500">
                  {format(scheduledAt, "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>

          {/* Home Team */}
          <div className="flex flex-col items-center gap-3 flex-1 max-w-xs">
            <Link
              href={`/${tenantSlug}/teams/${homeTeam.id}`}
              className="group transition-transform hover:scale-105"
            >
              {homeTeam.logoUrl ? (
                <img
                  src={homeTeam.logoUrl}
                  alt={homeTeam.name}
                  className="h-24 w-24 lg:h-32 lg:w-32 object-contain"
                />
              ) : (
                <div className="h-24 w-24 lg:h-32 lg:w-32 bg-slate-200 rounded-full flex items-center justify-center">
                  <Users className="h-12 w-12 lg:h-16 lg:w-16 text-slate-400" />
                </div>
              )}
            </Link>
            <Link
              href={`/${tenantSlug}/teams/${homeTeam.id}`}
              className="text-center group"
            >
              <h2
                className={cn(
                  "text-xl lg:text-2xl font-bold group-hover:text-[var(--league-primary-color)] transition-colors",
                  homeTeamWon ? "text-[var(--league-primary-color)]" : "text-slate-900"
                )}
              >
                {homeTeam.name}
              </h2>
              {homeTeam.record && (
                <p className="text-sm text-slate-500 mt-1">
                  {formatRecord(homeTeam.record)}
                </p>
              )}
            </Link>
          </div>
        </div>

        {/* Game Metadata */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-slate-600">
          {venue && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{venue.name}</span>
            </div>
          )}
          {division && (
            <Badge variant="secondary" className="text-sm">
              {division.name}
            </Badge>
          )}
          {!isLive && !isCancelled && !isPostponed && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{format(scheduledAt, "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
