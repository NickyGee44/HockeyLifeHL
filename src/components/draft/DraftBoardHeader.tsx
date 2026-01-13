"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  captain?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface DraftBoardHeaderProps {
  teams: Team[];
  currentPick: number;
  totalTeams: number;
  lastPickedPlayer?: {
    id: string;
    full_name: string;
    jersey_number: number | null;
    position: string | null;
    avatar_url: string | null;
    stats?: {
      games_played: number;
      goals: number;
      assists: number;
      points: number;
      attendance_rate: number;
    };
  };
  lastPickedTeam?: Team;
}

export function DraftBoardHeader({
  teams,
  currentPick,
  totalTeams,
  lastPickedPlayer,
  lastPickedTeam,
}: DraftBoardHeaderProps) {
  // Calculate which team is on the clock using draft order positions
  // Teams are already in draft order (1st pick, 2nd pick, etc.)
  const round = Math.ceil(currentPick / totalTeams);
  const isOddRound = round % 2 === 1;
  const positionInRound = ((currentPick - 1) % totalTeams) + 1;

  // Calculate which position (1-N) should pick
  let expectedPosition: number;
  if (isOddRound) {
    expectedPosition = positionInRound; // 1, 2, 3... in odd rounds
  } else {
    expectedPosition = totalTeams - positionInRound + 1; // N, N-1, N-2... in even rounds
  }

  // Find team at that position (teams array is already in order 1-N)
  const currentTeamOnClock = teams[expectedPosition - 1];

  return (
    <div className="space-y-6">
      {/* Team Order Row */}
      <div className="relative">
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4">
          {teams.map((team, index) => {
            const teamPosition = index + 1; // Position in draft order (1-N)
            const isCurrentTurn = teamPosition === expectedPosition;

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isCurrentTurn ? 1.1 : 1,
                }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="relative flex-shrink-0"
              >
                <Link
                  href={`/teams/${team.id}`}
                  className="block group"
                >
                  <div
                    className={`w-20 h-20 rounded-lg border-4 flex flex-col items-center justify-center p-2 transition-all cursor-pointer ${
                      isCurrentTurn
                        ? "ring-4 ring-gold shadow-2xl animate-pulse"
                        : "hover:scale-105"
                    }`}
                    style={{
                      backgroundColor: team.primary_color,
                      borderColor: isCurrentTurn
                        ? "#FFD700"
                        : team.secondary_color,
                      boxShadow: isCurrentTurn
                        ? `0 0 30px ${team.primary_color}80, 0 0 60px #FFD700`
                        : "none",
                    }}
                  >
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span
                        className="text-white font-bold text-xs text-center"
                        style={{ color: team.secondary_color }}
                      >
                        {team.short_name}
                      </span>
                    )}
                    <Badge
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: isCurrentTurn
                          ? "#FFD700"
                          : team.secondary_color,
                        color: isCurrentTurn ? "#000" : team.primary_color,
                      }}
                    >
                      {index + 1}
                    </Badge>
                  </div>
                  <p
                    className="text-xs text-center mt-1 font-medium truncate w-20"
                    style={{
                      color: isCurrentTurn ? "#FFD700" : "inherit",
                      fontWeight: isCurrentTurn ? "bold" : "normal",
                    }}
                  >
                    {team.short_name}
                  </p>
                  {isCurrentTurn && (
                    <p className="text-xs text-center text-gold font-bold animate-pulse">
                      ON CLOCK
                    </p>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Last Picked Player */}
      {lastPickedPlayer && lastPickedTeam && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-canada-red via-rink-blue to-gold rounded-lg p-6 text-white"
        >
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <Avatar className="h-20 w-20 border-4 border-white">
                <AvatarImage src={lastPickedPlayer.avatar_url || ""} />
                <AvatarFallback className="bg-white text-black flex items-center justify-center">
                  {lastPickedPlayer.avatar_url ? (
                    lastPickedPlayer.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2) || "??"
                  ) : (
                    <User className="h-10 w-10 text-black" />
                  )}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold">
                  {lastPickedPlayer.full_name}
                </h3>
                {lastPickedPlayer.jersey_number && (
                  <Badge className="bg-white text-canada-red font-mono text-lg px-3">
                    #{lastPickedPlayer.jersey_number}
                  </Badge>
                )}
                {lastPickedPlayer.position && (
                  <Badge variant="outline" className="border-white text-white">
                    {lastPickedPlayer.position}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mb-2">
                <Link
                  href={`/teams/${lastPickedTeam.id}`}
                  className="hover:underline font-semibold"
                >
                  → {lastPickedTeam.name}
                </Link>
              </div>
              {lastPickedPlayer.stats && (
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="opacity-75">Games:</span>{" "}
                    <span className="font-bold">
                      {lastPickedPlayer.stats.games_played}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-75">Goals:</span>{" "}
                    <span className="font-bold">
                      {lastPickedPlayer.stats.goals}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-75">Assists:</span>{" "}
                    <span className="font-bold">
                      {lastPickedPlayer.stats.assists}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-75">Points:</span>{" "}
                    <span className="font-bold">
                      {lastPickedPlayer.stats.points}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-75">Attendance:</span>{" "}
                    <span className="font-bold">
                      {(lastPickedPlayer.stats.attendance_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
