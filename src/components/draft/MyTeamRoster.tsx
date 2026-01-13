"use client";

import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PlayerRating } from "@/types/database";

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
    avatar_url: string | null;
  };
}

interface PlayerWithRating {
  player_id: string;
  rating: PlayerRating;
  player: {
    id: string;
    full_name: string;
    jersey_number: number | null;
    position: string | null;
    avatar_url: string | null;
  };
}

interface MyTeamRosterProps {
  teamId: string;
  picks: DraftPick[];
  availablePlayers: PlayerWithRating[];
  draftId?: string;
  seasonId?: string;
}

export function MyTeamRoster({ teamId, picks, availablePlayers, draftId, seasonId }: MyTeamRosterProps) {
  const [playerRatings, setPlayerRatings] = useState<Record<string, PlayerRating>>({});

  // Get my team's picks
  const myTeamPicks = useMemo(() => {
    return picks.filter(p => p.team.id === teamId);
  }, [picks, teamId]);

  // Fetch ratings for drafted players
  useEffect(() => {
    async function fetchRatings() {
      if (myTeamPicks.length === 0 || !seasonId) return;

      const supabase = createClient();
      const playerIds = myTeamPicks.map(p => p.player.id);

      // Get ratings for all drafted players
      const { data: ratings } = await supabase
        .from("player_ratings")
        .select("player_id, rating")
        .eq("season_id", seasonId)
        .in("player_id", playerIds);

      if (ratings) {
        const ratingsMap: Record<string, PlayerRating> = {};
        ratings.forEach(r => {
          ratingsMap[r.player_id] = r.rating;
        });
        setPlayerRatings(ratingsMap);
      }
    }

    fetchRatings();
  }, [myTeamPicks, seasonId]);

  // Get player ratings for my team's picks
  const myTeamPlayers = useMemo(() => {
    return myTeamPicks.map(pick => {
      // First try to get from fetched ratings
      const rating = playerRatings[pick.player.id];
      if (rating) {
        return {
          ...pick,
          rating,
        };
      }
      // Fallback to availablePlayers (for players just drafted)
      const playerWithRating = availablePlayers.find(
        ap => (ap.player_id || ap.player?.id) === pick.player.id
      );
      return {
        ...pick,
        rating: playerWithRating?.rating || 'C' as PlayerRating,
      };
    });
  }, [myTeamPicks, availablePlayers, playerRatings]);

  // Calculate position breakdown
  const positionBreakdown = useMemo(() => {
    const positions: Record<string, number> = {
      'C': 0,
      'LW': 0,
      'RW': 0,
      'D': 0,
      'G': 0,
    };

    myTeamPlayers.forEach(player => {
      const pos = player.player.position;
      if (pos && positions.hasOwnProperty(pos)) {
        positions[pos]++;
      }
    });

    return positions;
  }, [myTeamPlayers]);

  // Calculate rating composition
  const ratingComposition = useMemo(() => {
    const ratings: Record<string, number> = {
      'A+': 0, 'A': 0, 'A-': 0,
      'B+': 0, 'B': 0, 'B-': 0,
      'C+': 0, 'C': 0, 'C-': 0,
      'D+': 0, 'D': 0, 'D-': 0,
    };

    myTeamPlayers.forEach(player => {
      const rating = player.rating;
      if (rating && ratings.hasOwnProperty(rating)) {
        ratings[rating]++;
      }
    });

    return ratings;
  }, [myTeamPlayers]);

  // Determine what positions are still needed (assuming 13 players per team)
  const targetPositions: Record<string, number> = {
    'C': 2,
    'LW': 2,
    'RW': 2,
    'D': 4,
    'G': 2,
  };

  const neededPositions = useMemo(() => {
    const needed: string[] = [];
    Object.entries(targetPositions).forEach(([pos, target]) => {
      const current = positionBreakdown[pos] || 0;
      const stillNeeded = target - current;
      if (stillNeeded > 0) {
        needed.push(`${pos} (${stillNeeded})`);
      }
    });
    return needed;
  }, [positionBreakdown]);

  const getRatingColor = (rating: PlayerRating) => {
    if (rating.startsWith("A")) return "bg-gold text-puck-black border-gold";
    if (rating.startsWith("B")) return "bg-green-600 text-white border-green-700";
    if (rating.startsWith("C")) return "bg-yellow-600 text-white border-yellow-700";
    return "bg-gray-600 text-white border-gray-700";
  };

  return (
    <Card className="border-2 border-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">My Team Roster</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground">Players</div>
            <div className="font-bold text-lg">{myTeamPlayers.length}/13</div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-xs text-muted-foreground">Round</div>
            <div className="font-bold text-lg">{myTeamPicks.length > 0 ? Math.max(...myTeamPicks.map(p => p.round)) : 0}</div>
          </div>
        </div>

        {/* Position Breakdown */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">Positions</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(positionBreakdown).map(([pos, count]) => (
              <Badge
                key={pos}
                variant={count >= (targetPositions[pos] || 0) ? "default" : "outline"}
                className="text-xs"
              >
                {pos}: {count}/{targetPositions[pos] || 0}
              </Badge>
            ))}
          </div>
          {neededPositions.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Still need: {neededPositions.join(", ")}
            </div>
          )}
        </div>

        {/* Rating Composition */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">Rating Composition</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ratingComposition)
              .filter(([_, count]) => count > 0)
              .map(([rating, count]) => (
                <Badge
                  key={rating}
                  className={`${getRatingColor(rating as PlayerRating)} text-xs px-2 py-0.5`}
                >
                  {rating}: {count}
                </Badge>
              ))}
            {Object.values(ratingComposition).every(count => count === 0) && (
              <span className="text-xs text-muted-foreground">No players yet</span>
            )}
          </div>
        </div>

        {/* Current Roster */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Current Roster ({myTeamPlayers.length})
          </div>
          {myTeamPlayers.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No players drafted yet
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {myTeamPlayers
                .sort((a, b) => a.pick_number - b.pick_number)
                .map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player.player.avatar_url || ""} />
                      <AvatarFallback className={`${getRatingColor(player.rating)} flex items-center justify-center`}>
                        <User className="h-4 w-4 text-black" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {player.player.full_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {player.player.position && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {player.player.position}
                          </Badge>
                        )}
                        {player.player.jersey_number && (
                          <span>#{player.player.jersey_number}</span>
                        )}
                        <span>•</span>
                        <span>R{player.round}</span>
                      </div>
                    </div>
                    <Badge
                      className={`${getRatingColor(player.rating)} text-xs px-2 py-0.5`}
                    >
                      {player.rating}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
