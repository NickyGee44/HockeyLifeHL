"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getSeasonPlayerStats, getSeasonGoalieStats, getCareerPlayerStats, getCareerGoalieStats } from "@/lib/stats/queries";
import { getAllSeasons, getActiveSeason } from "@/lib/seasons/actions";
import type { Season } from "@/types/database";

export default function StatsPage() {
  const [viewMode, setViewMode] = useState<"season" | "career">("season");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  const [goalieStats, setGoalieStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Load seasons and active season
  useEffect(() => {
    async function loadSeasons() {
      setLoading(true);
      const [seasonsResult, activeSeasonResult] = await Promise.all([
        getAllSeasons(),
        getActiveSeason(),
      ]);

      if (seasonsResult.seasons) {
        setSeasons(seasonsResult.seasons);
      }

      if (activeSeasonResult.season) {
        setActiveSeason(activeSeasonResult.season);
        setSelectedSeasonId(activeSeasonResult.season.id);
      } else if (seasonsResult.seasons && seasonsResult.seasons.length > 0) {
        // If no active season, default to most recent season
        setSelectedSeasonId(seasonsResult.seasons[0].id);
      }

      setLoading(false);
    }

    loadSeasons();
  }, []);

  // Load stats when view mode or season changes
  useEffect(() => {
    async function loadStats() {
      if (viewMode === "career") {
        setStatsLoading(true);
        const [playerResult, goalieResult] = await Promise.all([
          getCareerPlayerStats(),
          getCareerGoalieStats(),
        ]);

        setPlayerStats(playerResult.stats || []);
        setGoalieStats(goalieResult.stats || []);
        setStatsLoading(false);
      } else if (selectedSeasonId) {
        setStatsLoading(true);
        const [playerResult, goalieResult] = await Promise.all([
          getSeasonPlayerStats(selectedSeasonId),
          getSeasonGoalieStats(selectedSeasonId),
        ]);

        setPlayerStats(playerResult.stats || []);
        setGoalieStats(goalieResult.stats || []);
        setStatsLoading(false);
      }
    }

    loadStats();
  }, [viewMode, selectedSeasonId]);

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">
          <span className="text-foreground">Player </span>
          <span className="text-gold">Stats</span>
        </h1>
        <p className="text-muted-foreground">
          {viewMode === "career" 
            ? "All-Time Career Statistics" 
            : selectedSeason 
              ? `${selectedSeason.name} Season Statistics`
              : "Select a season to view statistics"}
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
              <button
                onClick={() => setViewMode("season")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "season"
                    ? "bg-background text-foreground shadow-sm"
                    : "hover:text-foreground"
                }`}
              >
                Season
              </button>
              <button
                onClick={() => setViewMode("career")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "career"
                    ? "bg-background text-foreground shadow-sm"
                    : "hover:text-foreground"
                }`}
              >
                Career
              </button>
            </div>

            {viewMode === "season" && (
              <Select
                value={selectedSeasonId || ""}
                onValueChange={setSelectedSeasonId}
                disabled={loading}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      <div className="flex items-center gap-2">
                        <span>{season.name}</span>
                        {(season.status === "active" || season.status === "playoffs") && (
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

      <Tabs defaultValue="players" className="space-y-6">
        <TabsList>
          <TabsTrigger value="players">
            Players ({playerStats.length})
          </TabsTrigger>
          <TabsTrigger value="goalies">
            Goalies ({goalieStats.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === "career" ? "All-Time Player Statistics" : "Player Statistics"}
              </CardTitle>
              <CardDescription>
                {viewMode === "career" 
                  ? "Career totals including historical stats" 
                  : "Goals, assists, and points leaders"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : playerStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No player stats available yet.
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-center">GP</TableHead>
                        <TableHead className="text-center">G</TableHead>
                        <TableHead className="text-center">A</TableHead>
                        <TableHead className="text-center font-bold">PTS</TableHead>
                        <TableHead className="text-center">PTS/G</TableHead>
                        {viewMode === "career" && (
                          <>
                            <TableHead className="text-center text-xs text-muted-foreground">Legacy GP</TableHead>
                            <TableHead className="text-center text-xs text-muted-foreground">Current GP</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {playerStats.map((stat, index) => {
                        if (!stat.player) {
                          return null;
                        }
                        return (
                          <TableRow key={stat.player.id || index}>
                            <TableCell className="text-center font-bold">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              {stat.player.id ? (
                                <Link
                                  href={`/stats/${stat.player.id}`}
                                  className="flex items-center gap-3 hover:underline"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={stat.player.avatar_url || ""} />
                                    <AvatarFallback className="bg-canada-red text-white text-xs">
                                      {getInitials(stat.player.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="font-medium">
                                      {stat.player.full_name || "Unknown"}
                                    </span>
                                    {stat.player.jersey_number !== null && stat.player.jersey_number !== undefined && (
                                      <span className="text-muted-foreground ml-2 font-mono">
                                        #{stat.player.jersey_number}
                                      </span>
                                    )}
                                    {stat.player.position && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {stat.player.position}
                                      </Badge>
                                    )}
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-canada-red text-white text-xs">
                                      {getInitials(stat.player.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="font-medium">
                                      {stat.player.full_name || "Unknown"}
                                    </span>
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      Legacy
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{stat.games || 0}</TableCell>
                            <TableCell className="text-center font-medium text-canada-red">
                              {stat.goals || 0}
                            </TableCell>
                            <TableCell className="text-center">{stat.assists || 0}</TableCell>
                            <TableCell className="text-center font-bold text-lg">
                              {stat.points || 0}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {stat.games > 0 ? ((stat.points || 0) / stat.games).toFixed(2) : "0.00"}
                            </TableCell>
                            {viewMode === "career" && (
                              <>
                                <TableCell className="text-center text-xs text-muted-foreground">
                                  {stat.legacy_games || 0}
                                </TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground">
                                  {stat.current_games || 0}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goalies">
          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === "career" ? "All-Time Goalie Statistics" : "Goalie Statistics"}
              </CardTitle>
              <CardDescription>
                {viewMode === "career" 
                  ? "Career totals including historical stats" 
                  : "Goals against average and save percentage leaders"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : goalieStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No goalie stats available yet.
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Goalie</TableHead>
                        <TableHead className="text-center">GP</TableHead>
                        <TableHead className="text-center">GA</TableHead>
                        <TableHead className="text-center">Saves</TableHead>
                        <TableHead className="text-center">SO</TableHead>
                        <TableHead className="text-center font-bold">GAA</TableHead>
                        <TableHead className="text-center">SV%</TableHead>
                        {viewMode === "career" && (
                          <>
                            <TableHead className="text-center text-xs text-muted-foreground">Legacy GP</TableHead>
                            <TableHead className="text-center text-xs text-muted-foreground">Current GP</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goalieStats.map((stat, index) => {
                        if (!stat.player) {
                          return null;
                        }
                        return (
                          <TableRow key={stat.player.id || index}>
                            <TableCell className="text-center font-bold">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              {stat.player.id ? (
                                <Link
                                  href={`/stats/${stat.player.id}`}
                                  className="flex items-center gap-3 hover:underline"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={stat.player.avatar_url || ""} />
                                    <AvatarFallback className="bg-rink-blue text-white text-xs">
                                      {getInitials(stat.player.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="font-medium">
                                      {stat.player.full_name || "Unknown"}
                                    </span>
                                    {stat.player.jersey_number !== null && stat.player.jersey_number !== undefined && (
                                      <span className="text-muted-foreground ml-2 font-mono">
                                        #{stat.player.jersey_number}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-rink-blue text-white text-xs">
                                      {getInitials(stat.player.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="font-medium">
                                      {stat.player.full_name || "Unknown"}
                                    </span>
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      Legacy
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{stat.games || 0}</TableCell>
                            <TableCell className="text-center">{stat.goalsAgainst || 0}</TableCell>
                            <TableCell className="text-center">{stat.saves || 0}</TableCell>
                            <TableCell className="text-center font-medium text-gold">
                              {stat.shutouts || 0}
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg">
                              {stat.gaa ? stat.gaa.toFixed(2) : "0.00"}
                            </TableCell>
                            <TableCell className="text-center">
                              {stat.savePercentage ? stat.savePercentage.toFixed(1) : "0.0"}%
                            </TableCell>
                            {viewMode === "career" && (
                              <>
                                <TableCell className="text-center text-xs text-muted-foreground">
                                  {stat.legacy_games || 0}
                                </TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground">
                                  {stat.current_games || 0}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
