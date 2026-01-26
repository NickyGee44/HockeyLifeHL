"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Calendar, CreditCard, Users } from "lucide-react";

// Mock data
const MOCK_STATS = {
  goals: 12,
  assists: 8,
  points: 20,
  pim: 4,
  plusMinus: 5,
  gamesPlayed: 10
};

const MOCK_TEAM = [
  { id: 1, name: "Wayne Gretzky", position: "C", number: 99 },
  { id: 2, name: "Mario Lemieux", position: "C", number: 66 },
  { id: 3, name: "Bobby Orr", position: "D", number: 4 },
  { id: 4, name: "Patrick Roy", position: "G", number: 33 },
];

const MOCK_GAMES = [
  { id: 1, date: "2026-02-01", time: "20:00", opponent: "Wolves", location: "Rink A" },
  { id: 2, date: "2026-02-08", time: "21:30", opponent: "Bears", location: "Rink B" },
];

export default function PlayerDashboardPage({ params }: { params: { league: string } }) {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback>{profile?.full_name?.substring(0, 2).toUpperCase() || "P"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name || "Player"}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="text-primary border-primary/20">#{profile?.jersey_number || "00"}</Badge>
              {profile?.position || "Forward"} • Maple Leafs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-3 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-green-500" />
              <div className="text-sm">
                <p className="text-muted-foreground leading-none mb-1">Payment Status</p>
                <p className="font-bold text-green-500">PAID</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Points</CardDescription>
            <CardTitle className="text-3xl text-gold">{MOCK_STATS.points}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Goals</CardDescription>
            <CardTitle className="text-3xl text-canada-red">{MOCK_STATS.goals}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Assists</CardDescription>
            <CardTitle className="text-3xl text-rink-blue">{MOCK_STATS.assists}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">GP</CardDescription>
            <CardTitle className="text-3xl">{MOCK_STATS.gamesPlayed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_GAMES.map(game => (
                  <div key={game.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center bg-card border w-12 h-12 rounded-lg text-center">
                        <span className="text-[10px] uppercase font-bold">{new Date(game.date).toLocaleDateString("en-CA", { month: 'short' })}</span>
                        <span className="text-lg font-bold leading-none">{new Date(game.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-bold">vs {game.opponent}</p>
                        <p className="text-xs text-muted-foreground">{game.location} • {game.time}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Check-In</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_TEAM.map(player => (
                    <TableRow key={player.id}>
                      <TableCell className="font-mono">#{player.number}</TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.position}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-4 space-y-6">
          <Card className="bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gold" />
                Season Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gold/10 flex items-center justify-center text-lg">🥇</div>
                <div>
                  <p className="text-sm font-bold">Hat Trick Hero</p>
                  <p className="text-[10px] text-muted-foreground">Scored 3 goals in Game 4</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rink-blue/10 flex items-center justify-center text-lg">👟</div>
                <div>
                  <p className="text-sm font-bold">Playmaker</p>
                  <p className="text-[10px] text-muted-foreground">Reached 10 career assists</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
