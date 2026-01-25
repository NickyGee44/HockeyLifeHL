"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamLogo } from "@/components/ui/team-logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HockeyLoader } from "@/components/ui/hockey-loader";

interface CaptainDashboardViewProps {
  team: any;
  season: any;
  roster: any[];
  pendingStats: number;
  teamStats: any;
  activeDraft: any;
  games: any[];
  onEnterStats: (gameId: string) => void;
  onRequestSubs: (gameId: string) => void;
  requestingSubs: string | null;
  onUpdateAvailability: (playerId: string, status: "available" | "unavailable" | "maybe") => void;
  updatingAvailability: string | null;
  upcomingGame: any;
  loading: boolean;
  user: any;
}

export function CaptainDashboardView({
  team,
  season,
  roster,
  pendingStats,
  teamStats,
  activeDraft,
  games,
  onEnterStats,
  onRequestSubs,
  requestingSubs,
  onUpdateAvailability,
  updatingAvailability,
  upcomingGame,
  loading,
  user,
}: CaptainDashboardViewProps) {

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <HockeyLoader size="lg" text="Calling the lines..." />
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const sortedRoster = [...roster].sort((a, b) => {
    if (a.is_goalie && !b.is_goalie) return -1;
    if (!a.is_goalie && b.is_goalie) return 1;
    return (a.player.jersey_number ?? 999) - (b.player.jersey_number ?? 999);
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 md:space-y-8"
    >
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-card border border-border rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <TeamLogo team={team} size="xl" clickable={false} />
        </div>
        
        <div className="flex items-center gap-6 relative z-10">
          <TeamLogo team={team} size="xl" />
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
              Captain&apos;s <span className="text-canada-red">Hub</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-foreground font-semibold text-lg">{team.name}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{season?.name || "No Season"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          <Button asChild variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-primary/5">
             <Link href={`/teams/${team.id}`}>View Team Page →</Link>
          </Button>
          <Button asChild className="bg-canada-red hover:bg-canada-red-dark shadow-lg shadow-canada-red/20">
             <Link href="/captain/team">Manage Roster</Link>
          </Button>
        </div>
      </header>

      {/* Active Draft Alert */}
      {activeDraft && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-rink-blue to-rink-blue-dark p-6 rounded-2xl text-white shadow-xl shadow-rink-blue/20 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/puck-pattern.png')] opacity-10" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                <span className="text-3xl">🎯</span>
              </div>
              <div>
                <h3 className="text-xl font-bold font-display tracking-wide">DRAFT SEASON IS HERE</h3>
                <p className="text-white/80 text-sm">Pick #{activeDraft.current_pick} is now on the clock for {activeDraft.season?.name}.</p>
              </div>
            </div>
            <Button asChild className="bg-white text-rink-blue hover:bg-white/90 font-bold px-8">
              <Link href={activeDraft.draft_link ? `/captain/draft?draft=${activeDraft.draft_link}` : "/captain/draft"}>
                Enter Draft Room
              </Link>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Team Record</CardDescription>
            <CardTitle className="text-3xl font-display">
              {teamStats?.wins || 0}-{teamStats?.losses || 0}-{teamStats?.ties || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold">
              <span>{teamStats?.points || 0} Points</span>
              <span>Pos: #{teamStats?.standing || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Availability</CardDescription>
            <CardTitle className="text-3xl font-display text-rink-blue">
              {roster.filter(r => r.availability?.status === "available").length} / {roster.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Ready for Next Game</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-canada-red/20">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Pending Verification</CardDescription>
            <CardTitle className={`text-3xl font-display ${pendingStats > 0 ? "text-canada-red" : "text-muted-foreground"}`}>
              {pendingStats}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Games Needing Stats</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Roster Health</CardDescription>
            <CardTitle className="text-3xl font-display text-gold">
               {Math.round((roster.reduce((acc, r) => acc + (r.stats?.attendanceRate || 0), 0) / (roster.length || 1)))}%
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Average Attendance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Left Column - Games and Roster */}
        <div className="md:col-span-8 space-y-8">
          
          <GamesSection 
            games={games}
            team={team}
            onEnterStats={onEnterStats}
            onRequestSubs={onRequestSubs}
            requestingSubs={requestingSubs}
          />

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Team Roster</CardTitle>
                <CardDescription>Performance & Availability</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-canada-red hover:text-canada-red-dark">
                <Link href="/captain/team">Edit Roster →</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center">GP</TableHead>
                      <TableHead className="text-center">G</TableHead>
                      <TableHead className="text-center">A</TableHead>
                      <TableHead className="text-center">Pts</TableHead>
                      {upcomingGame && <TableHead className="text-right">Attendance</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRoster.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell className="text-center font-display font-bold text-lg text-muted-foreground">
                          {entry.player.jersey_number ?? "--"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={entry.player.avatar_url || ""} />
                              <AvatarFallback className="bg-muted text-[10px]">{getInitials(entry.player.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                               <div className="font-semibold text-sm">{entry.player.full_name}</div>
                               <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                 {entry.is_goalie ? "Goalie" : entry.player.position || "Player"}
                               </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{entry.stats?.gamesPlayed || 0}</TableCell>
                        <TableCell className="text-center">{entry.stats?.goals || 0}</TableCell>
                        <TableCell className="text-center">{entry.stats?.assists || 0}</TableCell>
                        <TableCell className="text-center font-bold text-gold">{entry.stats?.points || 0}</TableCell>
                        {upcomingGame && (
                          <TableCell className="text-right">
                             <Select
                              value={entry.availability?.status || ""}
                              onValueChange={(value) => onUpdateAvailability(entry.player.id, value as any)}
                              disabled={updatingAvailability === entry.player.id}
                            >
                              <SelectTrigger className={`w-[110px] h-8 ml-auto text-[10px] font-bold uppercase tracking-tighter ${
                                entry.availability?.status === "available" ? "border-success bg-success/10 text-success" :
                                entry.availability?.status === "unavailable" ? "border-destructive bg-destructive/10 text-destructive" :
                                entry.availability?.status === "maybe" ? "border-warning bg-warning/10 text-warning" : ""
                              }`}>
                                <SelectValue placeholder="STATUS" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="available">✓ IN</SelectItem>
                                <SelectItem value="maybe">? MAYBE</SelectItem>
                                <SelectItem value="unavailable">✗ OUT</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions Hub */}
        <div className="md:col-span-4 space-y-6">
          <Card className="border-border/50 bg-gradient-to-br from-card to-canada-red/5 overflow-hidden">
             <div className="bg-canada-red/10 p-4 border-b border-canada-red/10">
               <h3 className="font-display font-bold uppercase tracking-widest text-canada-red">Quick Action Hub</h3>
             </div>
             <CardContent className="p-4 grid gap-3">
               <Button asChild variant="outline" className="h-14 justify-start gap-4 border-border/50 hover:border-canada-red/50 hover:bg-canada-red/5 transition-all group">
                  <Link href="/captain/stats" className="flex items-center gap-4 w-full">
                    <span className="text-2xl bg-muted p-2 rounded-lg group-hover:bg-canada-red/10 transition-colors">✏️</span>
                    <div className="text-left">
                      <div className="font-bold text-sm">Enter Game Stats</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">Submit results for verification</div>
                    </div>
                  </Link>
               </Button>
               
               <Button asChild variant="outline" className="h-14 justify-start gap-4 border-border/50 hover:border-rink-blue/50 hover:bg-rink-blue/5 transition-all group">
                  <Link href="/captain/draft" className="flex items-center gap-4 w-full">
                    <span className="text-2xl bg-muted p-2 rounded-lg group-hover:bg-rink-blue/10 transition-colors">🎯</span>
                    <div className="text-left">
                      <div className="font-bold text-sm">Draft Room</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">Scout & draft new talent</div>
                    </div>
                  </Link>
               </Button>

               <Button asChild variant="outline" className="h-14 justify-start gap-4 border-border/50 hover:border-gold/50 hover:bg-gold/5 transition-all group">
                  <Link href="/captain/team" className="flex items-center gap-4 w-full">
                    <span className="text-2xl bg-muted p-2 rounded-lg group-hover:bg-gold/10 transition-colors">👥</span>
                    <div className="text-left">
                      <div className="font-bold text-sm">Team Management</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">Manage your season roster</div>
                    </div>
                  </Link>
               </Button>
             </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Captain&apos;s Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-sm">
                <p className="font-semibold mb-2">💡 Quick Tip</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Always verify game stats within 24 hours of the final whistle to ensure standings stay accurate.
                </p>
              </div>
              <div className="space-y-2">
                <Link href="/rules" className="block text-xs text-muted-foreground hover:text-canada-red transition-colors">→ League Rules & Regulations</Link>
                <Link href="/contact" className="block text-xs text-muted-foreground hover:text-canada-red transition-colors">→ Contact Commissioner</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// Internal Games Section (Enhanced)
function GamesSection({ games, team, onEnterStats, onRequestSubs, requestingSubs }: any) {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  // Games within 24 hours (upcoming)
  const upcomingGames = games.filter((g: any) => {
    const gameTime = new Date(g.scheduled_at);
    return gameTime >= now && gameTime <= twentyFourHoursFromNow;
  });

  const pendingActionGames = games.filter((g: any) => {
    if (g.status !== "completed" && new Date(g.scheduled_at) > now) return false;
    if (g.hasStats) {
       return g.isHomeTeam ? (!g.home_captain_verified && g.away_captain_verified) : (!g.away_captain_verified && g.home_captain_verified);
    }
    return true; // Needs stats
  }).slice(0, 3);

  if (upcomingGames.length === 0 && pendingActionGames.length === 0) return null;

  return (
    <div className="space-y-4">
      {upcomingGames.map((game: any) => {
        const gameTime = new Date(game.scheduled_at);
        const hoursUntilGame = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isUrgent = hoursUntilGame < 6;
        const subsRequested = game.isHomeTeam ? game.home_subs_requested : game.away_subs_requested;
        const subsRequestedAt = game.isHomeTeam ? game.home_subs_requested_at : game.away_subs_requested_at;

        return (
          <Card key={game.id} className="border-2 border-primary bg-primary/5 shadow-lg shadow-primary/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                       {hoursUntilGame < 24 && hoursUntilGame >= 1 ? `In ${Math.floor(hoursUntilGame)}h` : 'Game Day'}
                     </div>
                     <div className="text-3xl font-display font-bold leading-none mt-1">
                       {gameTime.toLocaleTimeString("en-CA", { hour: 'numeric', minute: '2-digit' })}
                     </div>
                  </div>
                  <div className="h-12 w-px bg-primary/20" />
                  <div>
                    <div className="text-xl font-bold font-display">vs {game.isHomeTeam ? game.away_team?.name : game.home_team?.name}</div>
                    <Badge variant="outline" className="border-primary/30 text-primary uppercase text-[10px] font-bold">{game.isHomeTeam ? "Home" : "Away"} Ice</Badge>
                  </div>
                </div>

                <div className="flex gap-3 flex-col md:flex-row">
                   <Button onClick={() => onEnterStats(game.id)} className="bg-primary hover:bg-primary-dark font-bold px-8">
                     Enter Game Stats
                   </Button>
                   {subsRequested ? (
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-success">Subs Requested ✓</Badge>
                        {subsRequestedAt && (
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(subsRequestedAt).toLocaleString('en-CA', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                   ) : (
                      <Button
                        variant="outline"
                        onClick={() => onRequestSubs(game.id)}
                        disabled={requestingSubs === game.id}
                        className={isUrgent ? "animate-pulse border-warning text-warning hover:bg-warning/10" : ""}
                      >
                        {requestingSubs === game.id ? "Requesting..." : "Request Subs"}
                      </Button>
                   )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {pendingActionGames.length > 0 && upcomingGames.length === 0 && (
         <Card className="border-canada-red/50 bg-canada-red/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-canada-red flex items-center gap-2">
                 <span>⚠️</span> Action Required
              </CardTitle>
              <CardDescription>Verify stats or submit missing game results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingActionGames.map((game: any) => (
                <div key={game.id} className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/50">
                  <div>
                    <div className="font-bold text-sm">vs {game.isHomeTeam ? game.away_team?.name : game.home_team?.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(game.scheduled_at).toLocaleDateString()}</div>
                  </div>
                  <Button size="sm" onClick={() => onEnterStats(game.id)} className="bg-canada-red/10 text-canada-red hover:bg-canada-red hover:text-white border-canada-red/20">
                    {game.hasStats ? "Verify Stats" : "Enter Stats"}
                  </Button>
                </div>
              ))}
            </CardContent>
         </Card>
      )}
    </div>
  );
}
