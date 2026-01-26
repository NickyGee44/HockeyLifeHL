"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HockeyLoader } from "@/components/ui/hockey-loader";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { currentLeague } from "@/lib/league-config";

interface DashboardLayoutProps {
  profile: any;
  stats: any;
  nextGame: any;
  checkInData: any;
  isCheckingIn: boolean;
  onCheckIn: (status: "available" | "unavailable" | "maybe") => Promise<void>;
  loading: boolean;
  error: string | null;
  activeLeague?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

export function DashboardView({
  profile,
  stats,
  nextGame,
  checkInData,
  isCheckingIn,
  onCheckIn,
  loading,
  error,
  activeLeague
}: DashboardLayoutProps) {
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <HockeyLoader size="lg" text="Sharpening skates..." />
      </div>
    );
  }

  const playerRating = stats?.games_played >= 5 ? "A" : stats?.games_played >= 3 ? "B" : stats?.games_played >= 1 ? "C" : "D";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 md:space-y-8"
    >
      {activeLeague && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg w-fit border border-border/50">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Managing:</span>
          <span className="text-sm font-semibold text-primary">{activeLeague.name}</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            Locker Room <span className="text-canada-red">Access</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="text-foreground font-semibold">{profile?.full_name?.split(" ")[0] || "Player"}</span>. Ready for the next shift?
          </p>
        </div>
        
        {profile?.jersey_number && (
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2 shadow-sm self-start md:self-auto">
            <div className="text-xs uppercase font-bold text-muted-foreground">Jersey</div>
            <div className="text-3xl font-display font-bold text-canada-red leading-none">#{profile.jersey_number}</div>
          </div>
        )}
      </header>

      {error && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            {error}. Some stats might be temporarily unavailable.
          </p>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Goals", value: stats?.goals || 0, color: "text-canada-red", sub: "Season Total" },
          { label: "Assists", value: stats?.assists || 0, color: "text-rink-blue", sub: "Season Total" },
          { label: "Points", value: stats?.points || 0, color: "text-gold", sub: "Season Total" },
          { label: "Rating", value: stats?.games_played > 0 ? playerRating : "-", color: "text-white", badge: true },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all">
              <CardHeader className="pb-1 p-4">
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest">{stat.label}</CardDescription>
                {stat.badge ? (
                  <div className="pt-1">
                    <span className={`rating-${playerRating.toLowerCase()} px-4 py-1 rounded-lg text-xl font-black shadow-lg`}>
                      {stat.value}
                    </span>
                  </div>
                ) : (
                  <CardTitle className={`text-3xl md:text-4xl font-display ${stat.color}`}>{stat.value}</CardTitle>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                  {stat.badge ? "Current Rank" : stat.sub}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: Game Info & Check-in */}
        <div className="md:col-span-8 space-y-6">
          {checkInData?.game && (
            <GameCheckInCard 
              checkInData={checkInData}
              isCheckingIn={isCheckingIn}
              onCheckIn={onCheckIn}
            />
          )}

          {!checkInData?.game && nextGame && (
             <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    📅 Next Game
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-puck-black/20 rounded-xl border border-white/5">
                    <div className="space-y-2">
                      <div className="text-2xl font-bold font-display">
                        {nextGame.home_team?.short_name || "HOME"} <span className="text-muted-foreground mx-2 font-sans font-normal">vs</span> {nextGame.away_team?.short_name || "AWAY"}
                      </div>
                      <div className="flex flex-col gap-1 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>📍</span> {nextGame.location || "TBD"}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>⏰</span> {new Date(nextGame.scheduled_at).toLocaleDateString("en-CA", { weekday: 'long', month: 'short', day: 'numeric' })} at {new Date(nextGame.scheduled_at).toLocaleTimeString("en-CA", { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="outline" className="border-primary/20 hover:bg-primary/10 hover:text-primary">
                      <Link href="/dashboard/schedule">Full Schedule →</Link>
                    </Button>
                  </div>
                </CardContent>
             </Card>
          )}

          {/* Recent Activity */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl">League Pulse</CardTitle>
                <CardDescription>Latest updates from around the rink</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Live</Badge>
            </CardHeader>
            <CardContent>
              <RecentActivityFeed userId={profile?.id || ""} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Player Info & Actions */}
        <div className="md:col-span-4 space-y-6">
          <Card className="border-border/50 bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <CardTitle className="text-xl">Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Position</p>
                  <p className="font-semibold">{profile?.position || "Unset"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Handedness</p>
                  <p className="font-semibold">{profile?.shot_hand ? (profile.shot_hand === 'left' ? 'Left' : 'Right') : "Unset"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Experience</p>
                  <p className="font-semibold">{stats?.games_played || 0} Games</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status</p>
                  <Badge className="bg-success/20 text-success border-success/30 hover:bg-success/20">Active</Badge>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border mt-4">
                 <Button asChild variant="outline" className="w-full justify-start gap-2 hover:bg-muted">
                    <Link href="/dashboard/profile"><span>⚙️</span> Edit Profile</Link>
                 </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="ghost" className="w-full justify-start gap-3 h-12 hover:bg-primary/10 hover:text-primary transition-colors">
                <Link href="/dashboard/stats"><span className="text-xl">📈</span> My Stats</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start gap-3 h-12 hover:bg-primary/10 hover:text-primary transition-colors">
                <Link href="/dashboard/team"><span className="text-xl">🏒</span> My Team</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start gap-3 h-12 hover:bg-primary/10 hover:text-primary transition-colors">
                <Link href="/dashboard/schedule"><span className="text-xl">📅</span> Full Schedule</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// Game Check-In Card Component (Internal to this view for now or can be moved to components)
function GameCheckInCard({ 
  checkInData, 
  isCheckingIn, 
  onCheckIn 
}: { 
  checkInData: any;
  isCheckingIn: boolean;
  onCheckIn: (status: "available" | "unavailable" | "maybe") => Promise<void>;
}) {
  const { game, availability, canCheckIn } = checkInData;
  
  if (!game) return null;

  const gameDate = new Date(game.scheduled_at);
  const isToday = gameDate.toDateString() === new Date().toDateString();
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-success text-white">✓ Playing</Badge>;
      case "unavailable":
        return <Badge variant="destructive">✗ Not Playing</Badge>;
      case "maybe":
        return <Badge className="bg-warning text-white">? Maybe</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className={`overflow-hidden border-2 transition-all duration-500 ${isToday ? "border-primary shadow-[0_0_20px_rgba(227,24,55,0.15)]" : "border-border/50"}`}>
      <CardHeader className={`${isToday ? "bg-primary/5" : "bg-muted/30"} pb-4`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              🏒 Next Shift <span className="text-muted-foreground">| Check-In</span>
              {isToday && <Badge className="bg-primary animate-pulse ml-2">TONIGHT</Badge>}
            </CardTitle>
            <CardDescription>Confirm your availability for the next game</CardDescription>
          </div>
          {availability?.status && getStatusBadge(availability.status)}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl w-20 h-20 shadow-inner">
               <span className="text-[10px] uppercase font-bold text-muted-foreground">{gameDate.toLocaleDateString("en-CA", { month: 'short' })}</span>
               <span className="text-3xl font-display font-bold text-primary">{gameDate.getDate()}</span>
               <span className="text-[10px] uppercase font-bold text-muted-foreground">{gameDate.toLocaleDateString("en-CA", { weekday: 'short' })}</span>
            </div>
            <div>
              <div className="text-xl font-bold font-display leading-tight">
                {game.home_team?.name} <span className="text-muted-foreground font-sans font-normal text-sm mx-1">vs</span> {game.away_team?.name}
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <span>⏰</span> {gameDate.toLocaleTimeString("en-CA", { hour: 'numeric', minute: '2-digit' })}
                <span className="text-white/10 mx-1">|</span>
                <span>📍</span> {game.location}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:min-w-[300px]">
            {canCheckIn ? (
               <>
                <Button
                  onClick={() => onCheckIn("available")}
                  disabled={isCheckingIn}
                  className={`flex-1 font-bold ${availability?.status === "available" ? "bg-success hover:bg-success/90 ring-4 ring-success/20" : "bg-success/80 hover:bg-success"}`}
                >
                  {isCheckingIn ? "..." : "✓ In"}
                </Button>
                <Button
                  onClick={() => onCheckIn("maybe")}
                  disabled={isCheckingIn}
                  variant="outline"
                  className={`flex-1 font-bold ${availability?.status === "maybe" ? "border-warning bg-warning/10 text-warning" : ""}`}
                >
                  {isCheckingIn ? "..." : "? Maybe"}
                </Button>
                <Button
                  onClick={() => onCheckIn("unavailable")}
                  disabled={isCheckingIn}
                  variant="outline"
                  className={`flex-1 font-bold ${availability?.status === "unavailable" ? "border-destructive bg-destructive/10 text-destructive" : ""}`}
                >
                  {isCheckingIn ? "..." : "✗ Out"}
                </Button>
               </>
            ) : (
              <div className="w-full p-3 bg-muted rounded-lg text-xs text-center text-muted-foreground">
                Availability check-in is not yet open for this game.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
