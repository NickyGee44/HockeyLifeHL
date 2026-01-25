"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import type { PlayerGoalieMatchup } from "@/lib/stats/matchup-queries";

interface PlayerGoalieMatchupsProps {
  matchups: PlayerGoalieMatchup[];
  upcomingGame?: any;
  isLoading?: boolean;
}

export function PlayerGoalieMatchups({
  matchups,
  upcomingGame,
  isLoading = false,
}: PlayerGoalieMatchupsProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-xl">Matchup Stats</CardTitle>
          <CardDescription>Loading upcoming opponent matchup...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!upcomingGame || matchups.length === 0) {
    return null; // Don't show if no upcoming game or no matchup data
  }

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPerformanceBadge = (shootingPct: number | null) => {
    if (!shootingPct) return null;

    if (shootingPct >= 25) {
      return <Badge className="bg-success text-white">Target 🎯</Badge>;
    } else if (shootingPct <= 10) {
      return <Badge className="bg-destructive text-white">Nemesis 😤</Badge>;
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="bg-primary/10 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <span>🏒</span> Upcoming Matchup
              </CardTitle>
              <CardDescription>
                Your stats vs. opponent's goalie
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {new Date(upcomingGame.scheduled_at).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
              })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {matchups.map((matchup) => (
              <motion.div
                key={matchup.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-background/50 rounded-xl p-5 border border-border/50"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Goalie Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage src={matchup.goalie?.avatar_url || ""} />
                      <AvatarFallback className="bg-muted text-lg">
                        {getInitials(matchup.goalie?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-lg">
                        {matchup.goalie?.full_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase">
                          Goalie
                        </Badge>
                        {getPerformanceBadge(matchup.shooting_percentage)}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-4 w-full md:w-auto">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground font-bold uppercase">GP</div>
                      <div className="text-2xl font-display font-bold mt-1">
                        {matchup.games_played}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground font-bold uppercase">G</div>
                      <div className="text-2xl font-display font-bold text-rink-blue mt-1">
                        {matchup.goals}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground font-bold uppercase">A</div>
                      <div className="text-2xl font-display font-bold text-canada-red mt-1">
                        {matchup.assists}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground font-bold uppercase">Pts</div>
                      <div className="text-2xl font-display font-bold text-gold mt-1">
                        {matchup.points}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground font-bold uppercase">SH%</div>
                      <div className="text-2xl font-display font-bold mt-1">
                        {matchup.shooting_percentage?.toFixed(1) || "0.0"}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {matchup.last_game_at && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Last faced:{" "}
                      {new Date(matchup.last_game_at).toLocaleDateString("en-CA", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}

            {matchups.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No previous matchups with this goalie. Time to make history!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
