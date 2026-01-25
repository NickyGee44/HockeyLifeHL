"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerTradingCard } from "./PlayerTradingCard";
import Link from "next/link";
import { Header, Footer } from "@/components/layout";

interface PlayerStatsViewProps {
  player: any;
  seasons: any[];
  selectedSeasonId?: string;
  playerStats: any[];
  goalieStats: any[];
  playerTotals: any;
  goalieTotals: any;
  playerId: string;
}

export function PlayerStatsView({
  player,
  seasons,
  selectedSeasonId,
  playerStats,
  goalieStats,
  playerTotals,
  goalieTotals,
  playerId
}: PlayerStatsViewProps) {
  
  const isGoalie = goalieStats.length > 0;
  const activeStats = isGoalie ? goalieStats : playerStats;
  const activeTotals = isGoalie ? goalieTotals : playerTotals;

  return (
    <div className="min-h-screen bg-arena flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: The Card */}
          <div className="lg:col-span-5 sticky top-24">
            <PlayerTradingCard 
              player={player} 
              totals={activeTotals} 
              isGoalie={isGoalie} 
            />
            
            {/* Season Selector inside Left Column */}
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
               <Link href={`/stats/${playerId}`}>
                <Badge variant={!selectedSeasonId ? "default" : "outline"} className="cursor-pointer h-8 px-4">
                  All Time
                </Badge>
              </Link>
              {seasons.map((season) => (
                <Link key={season.id} href={`/stats/${playerId}?season=${season.id}`}>
                  <Badge 
                    variant={selectedSeasonId === season.id ? "default" : "outline"} 
                    className="cursor-pointer h-8 px-4"
                  >
                    {season.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Column: Detailed Breakdown */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter">
                CAREER <span className="text-canada-red">INSIGHTS</span>
              </h1>
              <p className="text-muted-foreground text-lg">Detailed game logs and performance analysis.</p>
            </div>

            <Tabs defaultValue={isGoalie ? "goalie" : "player"} className="w-full">
              <TabsList className="bg-muted/50 p-1 mb-6">
                {playerStats.length > 0 && <TabsTrigger value="player" className="px-8 font-bold">Player Data</TabsTrigger>}
                {goalieStats.length > 0 && <TabsTrigger value="goalie" className="px-8 font-bold">Goalie Data</TabsTrigger>}
              </TabsList>

              <TabsContent value="player" className="space-y-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-xl font-display">Game Journal</CardTitle>
                    <CardDescription>Performance tracking for the {selectedSeasonId ? "selected" : "full"} career history.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-6">Date</TableHead>
                          <TableHead>Opponent</TableHead>
                          <TableHead className="text-center">G</TableHead>
                          <TableHead className="text-center">A</TableHead>
                          <TableHead className="text-center pr-6">PTS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playerStats.map((stat: any) => {
                          const opponent = stat.game.home_team_id === stat.team_id ? stat.game.away_team : stat.game.home_team;
                          return (
                            <TableRow key={stat.id} className="hover:bg-primary/5 transition-colors">
                              <TableCell className="pl-6 font-medium">
                                {new Date(stat.game.scheduled_at).toLocaleDateString("en-CA", { month: 'short', day: 'numeric', year: 'numeric' })}
                              </TableCell>
                              <TableCell className="font-semibold">{opponent?.name || "TBD"}</TableCell>
                              <TableCell className="text-center font-display font-bold text-canada-red">{stat.goals || 0}</TableCell>
                              <TableCell className="text-center font-display font-bold">{stat.assists || 0}</TableCell>
                              <TableCell className="text-center font-display font-black text-gold pr-6">{(stat.goals || 0) + (stat.assists || 0)}</TableCell>
                            </TableRow>
                          );
                        })}
                        {playerStats.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No stats recorded for this period.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="goalie" className="space-y-6">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-xl font-display">Crease Report</CardTitle>
                    <CardDescription>Detailed goaltending metrics for the {selectedSeasonId ? "selected" : "full"} career history.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-6">Date</TableHead>
                          <TableHead>Opponent</TableHead>
                          <TableHead className="text-center">GA</TableHead>
                          <TableHead className="text-center">SV</TableHead>
                          <TableHead className="text-center pr-6">SO</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {goalieStats.map((stat: any) => {
                          const opponent = stat.game.home_team_id === stat.team_id ? stat.game.away_team : stat.game.home_team;
                          return (
                            <TableRow key={stat.id} className="hover:bg-primary/5 transition-colors">
                              <TableCell className="pl-6 font-medium">
                                {new Date(stat.game.scheduled_at).toLocaleDateString("en-CA", { month: 'short', day: 'numeric', year: 'numeric' })}
                              </TableCell>
                              <TableCell className="font-semibold">{opponent?.name || "TBD"}</TableCell>
                              <TableCell className="text-center font-display font-bold text-canada-red">{stat.goals_against || 0}</TableCell>
                              <TableCell className="text-center font-display font-bold text-rink-blue">{stat.saves || 0}</TableCell>
                              <TableCell className="text-center pr-6">
                                {stat.shutout ? <Badge className="bg-gold text-puck-black font-black">SO</Badge> : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {goalieStats.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No crease data recorded for this period.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
