"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamLogo } from "@/components/ui/team-logo";
import { HockeyLoader } from "@/components/ui/hockey-loader";
import { motion } from "framer-motion";
import { getLeagueTimeline, getSeasonDetails, type SeasonTimeline } from "@/lib/league/history-queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function LeagueHistoryPage() {
  const [seasons, setSeasons] = useState<SeasonTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, []);

  async function loadTimeline() {
    const { seasons: data, error } = await getLeagueTimeline();
    if (!error) {
      setSeasons(data);
    }
    setLoading(false);
  }

  async function loadSeasonDetails(seasonId: string) {
    setDetailsLoading(true);
    const details = await getSeasonDetails(seasonId);
    setSeasonDetails(details);
    setDetailsLoading(false);
  }

  const handleSeasonClick = (seasonId: string) => {
    setSelectedSeason(seasonId);
    loadSeasonDetails(seasonId);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <HockeyLoader size="lg" text="Loading league history..." />
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      {/* Hero Section */}
      <header className="text-center py-12 bg-gradient-to-br from-card to-primary/5 rounded-2xl border border-border/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight">
            League <span className="text-gradient-canada">History</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">
            Relive the glory, the goals, and the legends. {seasons.length} seasons of hockey excellence.
          </p>
        </motion.div>
      </header>

      {/* Timeline Navigation */}
      <div className="space-y-4">
        <h2 className="text-2xl font-display font-bold">Seasons</h2>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory">
          {seasons.map((season, index) => (
            <motion.div
              key={season.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="snap-start"
            >
              <Button
                variant="outline"
                className={`whitespace-nowrap ${
                  selectedSeason === season.id ? "border-primary bg-primary/10" : ""
                }`}
                onClick={() => handleSeasonClick(season.id)}
              >
                {season.name}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Season Cards - Horizontal Scroll */}
      <div className="space-y-4">
        <h2 className="text-2xl font-display font-bold">Timeline</h2>
        <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory -mx-4 px-4">
          {seasons.map((season, index) => (
            <motion.div
              key={season.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="snap-start flex-shrink-0 w-[350px]"
            >
              <Card
                className="h-full cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
                onClick={() => handleSeasonClick(season.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{season.name}</CardTitle>
                    <Badge
                      variant={
                        season.status === "active" ? "default" :
                        season.status === "completed" ? "secondary" : "outline"
                      }
                    >
                      {season.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(season.start_date).getFullYear()} Season
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Champion */}
                  {season.champion_team && (
                    <div className="flex items-center gap-3 p-3 bg-gold/10 rounded-lg border border-gold/20">
                      <TeamLogo team={season.champion_team} size="sm" clickable={false} />
                      <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase">Champion</p>
                        <p className="font-semibold text-sm">{season.champion_team.name}</p>
                      </div>
                    </div>
                  )}

                  {/* Key Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground font-bold uppercase">Total Goals</p>
                      <p className="text-2xl font-display font-bold text-rink-blue">
                        {season.total_goals_scored || 0}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground font-bold uppercase">Avg GPG</p>
                      <p className="text-2xl font-display font-bold text-canada-red">
                        {season.average_goals_per_game?.toFixed(1) || "0.0"}
                      </p>
                    </div>
                  </div>

                  {/* Season Summary */}
                  {season.season_summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {season.season_summary}
                    </p>
                  )}

                  <Button variant="outline" size="sm" className="w-full">
                    View Details →
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Season Details Modal */}
      <Dialog open={selectedSeason !== null} onOpenChange={(open) => !open && setSelectedSeason(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <HockeyLoader size="md" text="Loading season details..." />
            </div>
          ) : seasonDetails ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">
                  {seasonDetails.season.name}
                </DialogTitle>
                <DialogDescription>
                  {new Date(seasonDetails.season.start_date).toLocaleDateString()} -{" "}
                  {new Date(seasonDetails.season.end_date).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Champion Highlight */}
                {seasonDetails.season.champion_team && (
                  <Card className="bg-gradient-to-br from-gold/20 to-transparent border-gold/30">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <span>🏆</span> Season Champion
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <TeamLogo team={seasonDetails.season.champion_team} size="lg" clickable={false} />
                        <div>
                          <h3 className="text-2xl font-display font-bold">
                            {seasonDetails.season.champion_team.name}
                          </h3>
                          <p className="text-muted-foreground">League Champions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Season Summary */}
                {seasonDetails.season.season_summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Season Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{seasonDetails.season.season_summary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Top Scorers */}
                {seasonDetails.topScorers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Scorers</CardTitle>
                      <CardDescription>Leading point producers of the season</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead className="text-center">GP</TableHead>
                            <TableHead className="text-center">G</TableHead>
                            <TableHead className="text-center">A</TableHead>
                            <TableHead className="text-center">Pts</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {seasonDetails.topScorers.map((stat: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-bold">{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={stat.player.avatar_url || ""} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(stat.player.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-sm">{stat.player.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{stat.team.name}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{stat.games_played}</TableCell>
                              <TableCell className="text-center">{stat.goals}</TableCell>
                              <TableCell className="text-center">{stat.assists}</TableCell>
                              <TableCell className="text-center font-bold text-gold">{stat.points}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Final Standings */}
                {seasonDetails.finalStandings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Final Standings</CardTitle>
                      <CardDescription>End of season team rankings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-center">W</TableHead>
                            <TableHead className="text-center">L</TableHead>
                            <TableHead className="text-center">T</TableHead>
                            <TableHead className="text-center">Pts</TableHead>
                            <TableHead className="text-center">GF</TableHead>
                            <TableHead className="text-center">GA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {seasonDetails.finalStandings.map((standing: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-bold">{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <TeamLogo team={standing.team} size="xs" clickable={false} />
                                  <span className="font-semibold">{standing.team.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{standing.wins}</TableCell>
                              <TableCell className="text-center">{standing.losses}</TableCell>
                              <TableCell className="text-center">{standing.ties}</TableCell>
                              <TableCell className="text-center font-bold">{standing.points}</TableCell>
                              <TableCell className="text-center">{standing.goals_for}</TableCell>
                              <TableCell className="text-center">{standing.goals_against}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
