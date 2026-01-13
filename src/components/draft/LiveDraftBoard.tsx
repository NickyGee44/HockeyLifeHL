"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "lucide-react";
import Link from "next/link";
import type { PlayerRating } from "@/types/database";

interface Player {
  player_id: string;
  rating: PlayerRating;
  games_played: number;
  attendance_rate: number;
  points_per_game: number;
  goals_per_game?: number;
  assists_per_game?: number;
  gaa?: number;
  save_percentage?: number;
  player: {
    id: string;
    full_name: string;
    jersey_number: number | null;
    position: string | null;
    avatar_url: string | null;
  };
}

interface DraftPick {
  id: string;
  pick_number: number;
  round: number;
  team: {
    id: string;
    name: string;
    short_name: string;
    primary_color: string;
  };
  player: {
    id: string;
    full_name: string;
    jersey_number: number | null;
    position: string | null;
  };
}

interface LiveDraftBoardProps {
  draft: any;
  availablePlayers: Player[];
  picks: DraftPick[];
  isMyTurn: boolean;
  currentTeamTurn: any;
  onPick: (playerId: string) => void;
  isOwner?: boolean;
  selectedTeamId?: string;
}

export function LiveDraftBoard({
  draft,
  availablePlayers,
  picks,
  isMyTurn,
  currentTeamTurn,
  onPick,
  isOwner = false,
  selectedTeamId,
}: LiveDraftBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"rating" | "ppg" | "attendance" | "name">("rating");

  const draftedPlayerIds = new Set(picks.map((p) => p.player.id));

  const filteredPlayers = useMemo(() => {
    return availablePlayers
      .filter((p) => {
        const playerId = p.player_id || p.player?.id;
        if (!playerId || draftedPlayerIds.has(playerId)) return false;

        const name = p.player?.full_name || "";
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRating = filterRating === "all" || p.rating === filterRating;
        const matchesPosition =
          filterPosition === "all" || p.player?.position === filterPosition;

        return matchesSearch && matchesRating && matchesPosition;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "rating":
            const ratingOrder: Record<string, number> = {
              "A+": 0, "A": 1, "A-": 2,
              "B+": 3, "B": 4, "B-": 5,
              "C+": 6, "C": 7, "C-": 8,
              "D+": 9, "D": 10, "D-": 11,
            };
            return (ratingOrder[a.rating] || 99) - (ratingOrder[b.rating] || 99);
          case "ppg":
            return (b.points_per_game || 0) - (a.points_per_game || 0);
          case "attendance":
            return b.attendance_rate - a.attendance_rate;
          case "name":
            return (a.player?.full_name || "").localeCompare(b.player?.full_name || "");
          default:
            return 0;
        }
      });
  }, [availablePlayers, draftedPlayerIds, searchTerm, filterRating, filterPosition, sortBy]);

  const getRatingColor = (rating: PlayerRating) => {
    if (rating.startsWith("A")) return "bg-gold text-puck-black border-gold";
    if (rating.startsWith("B")) return "bg-green-600 text-white border-green-700";
    if (rating.startsWith("C")) return "bg-yellow-600 text-white border-yellow-700";
    return "bg-gray-600 text-white border-gray-700";
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const canPick = isOwner || isMyTurn;

  return (
    <div className="space-y-4">
      {/* Filters and Search - Compact */}
      <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="Search players by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Ratings</option>
              <option value="A+">A+</option>
              <option value="A">A</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B">B</option>
              <option value="B-">B-</option>
              <option value="C+">C+</option>
              <option value="C">C</option>
              <option value="C-">C-</option>
              <option value="D+">D+</option>
              <option value="D">D</option>
              <option value="D-">D-</option>
            </select>
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Positions</option>
              <option value="C">Center</option>
              <option value="LW">Left Wing</option>
              <option value="RW">Right Wing</option>
              <option value="D">Defense</option>
              <option value="G">Goalie</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="rating">Sort by Rating</option>
              <option value="ppg">Sort by PPG</option>
              <option value="attendance">Sort by Attendance</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

      {/* Available Players Grid - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredPlayers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No players available matching your filters
          </div>
        ) : (
          filteredPlayers.map((player: any) => {
            const playerId = player.player_id || player.player?.id;
            const playerData = player.player || {};
            const isGoalie = playerData.position === "G";

            return (
              <Card
                key={playerId}
                className={`transition-all hover:shadow-lg ${
                  canPick && draft.status === "in_progress"
                    ? "hover:border-canada-red cursor-pointer border-2"
                    : "opacity-75"
                } ${
                  canPick && draft.status === "in_progress"
                    ? "border-canada-red"
                    : "border"
                }`}
                onClick={() => {
                  if (canPick && draft.status === "in_progress") {
                    onPick(playerId);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={playerData.avatar_url || ""} />
                        <AvatarFallback className={`${getRatingColor(player.rating)} flex items-center justify-center`}>
                          <User className="h-6 w-6 text-black" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/stats/${playerId}`}
                          className="font-semibold hover:underline block truncate text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {playerData.full_name || "Unknown"}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {playerData.jersey_number && (
                            <Badge variant="outline" className="font-mono text-xs px-1 py-0">
                              #{playerData.jersey_number}
                            </Badge>
                          )}
                          {playerData.position && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              {playerData.position}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={`${getRatingColor(player.rating)} text-sm font-bold px-2 py-1 border-2`}
                    >
                      {player.rating}
                    </Badge>
                  </div>

                  {/* Stats - Compact */}
                  <div className="space-y-1 text-xs">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-muted/50 rounded p-1.5">
                        <div className="text-[10px] text-muted-foreground">Games</div>
                        <div className="font-semibold text-sm">{player.games_played || 0}</div>
                      </div>
                      <div className="bg-muted/50 rounded p-1.5">
                        <div className="text-[10px] text-muted-foreground">Attendance</div>
                        <div className="font-semibold text-sm">
                          {(player.attendance_rate * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {isGoalie ? (
                      <div className="grid grid-cols-2 gap-2">
                        {player.gaa !== undefined && (
                          <div className="bg-muted/50 rounded p-2">
                            <div className="text-xs text-muted-foreground">GAA</div>
                            <div className="font-semibold">{player.gaa.toFixed(2)}</div>
                          </div>
                        )}
                        {player.save_percentage !== undefined && (
                          <div className="bg-muted/50 rounded p-2">
                            <div className="text-xs text-muted-foreground">SV%</div>
                            <div className="font-semibold">
                              {player.save_percentage.toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-muted/50 rounded p-2">
                          <div className="text-xs text-muted-foreground">PPG</div>
                          <div className="font-semibold">
                            {player.points_per_game?.toFixed(2) || "0.00"}
                          </div>
                        </div>
                        {player.goals_per_game !== undefined && (
                          <div className="bg-muted/50 rounded p-2">
                            <div className="text-xs text-muted-foreground">GPG</div>
                            <div className="font-semibold">
                              {player.goals_per_game.toFixed(2)}
                            </div>
                          </div>
                        )}
                        {player.assists_per_game !== undefined && (
                          <div className="bg-muted/50 rounded p-2">
                            <div className="text-xs text-muted-foreground">APG</div>
                            <div className="font-semibold">
                              {player.assists_per_game.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {canPick && draft.status === "in_progress" && (
                    <Button
                      className="w-full mt-3 bg-canada-red hover:bg-canada-red-dark"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPick(playerId);
                      }}
                    >
                      {isOwner ? "Draft for Team" : "Draft Player"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
