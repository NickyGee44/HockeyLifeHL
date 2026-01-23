"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamLogo } from "@/components/ui/team-logo";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getPendingVerificationsCount, getTeamStatsSummary, getRosterWithStats, setPlayerAvailabilityAsCaptain } from "@/lib/captain/stats-queries";
import { getGamesNeedingStats } from "@/lib/stats/actions";
import { GameStatEntryModal } from "@/components/captain/GameStatEntryModal";
import { requestSubsForGame } from "@/lib/players/availability-actions";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TeamData = {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

type RosterPlayer = {
  id: string;
  is_goalie: boolean;
  player: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    jersey_number: number | null;
    position: string | null;
    shot_hand: "left" | "right" | null;
  };
  stats: {
    goals: number;
    assists: number;
    points: number;
    gamesPlayed: number;
    attendanceRate: number;
  };
  goalieStats: {
    saves: number;
    goalsAgainst: number;
    gamesPlayed: number;
  } | null;
  availability: {
    status: string;
    checkedInAt: string | null;
  } | null;
};

type UpcomingGame = {
  id: string;
  scheduledAt: string;
} | null;

type SeasonData = {
  id: string;
  name: string;
  status: string | null;
};

type ActiveDraft = {
  id: string;
  status: string;
  current_pick: number;
  draft_link: string | null;
  season: {
    name: string;
  };
};

type GameForStats = {
  id: string;
  scheduled_at: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  home_captain_verified: boolean | null;
  away_captain_verified: boolean | null;
  stats_submitted_by: string | null;
  home_subs_requested: boolean | null;
  away_subs_requested: boolean | null;
  home_team: { id: string; name: string; short_name: string } | null;
  away_team: { id: string; name: string; short_name: string } | null;
  season: { id: string; name: string } | null;
  hasStats: boolean;
  isHomeTeam: boolean;
};

export default function CaptainDashboardPage() {
  const { user, profile, loading: authLoading, isCaptain } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [pendingStats, setPendingStats] = useState<number>(0);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [activeDraft, setActiveDraft] = useState<ActiveDraft | null>(null);
  const [games, setGames] = useState<GameForStats[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [requestingSubs, setRequestingSubs] = useState<string | null>(null);
  const [upcomingGame, setUpcomingGame] = useState<UpcomingGame>(null);
  const [updatingAvailability, setUpdatingAvailability] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // If no user, stop loading
    if (!user) {
      setLoading(false);
      return;
    }

    // If profile is still loading, wait
    if (!profile && !authLoading) {
      // Profile might be loading, give it a moment
      return;
    }

    // Check if user is captain
    if (user && isCaptain) {
      loadCaptainData();
    } else if (!authLoading) {
      // Not a captain or profile failed to load
      setLoading(false);
    }
  }, [user, profile, isCaptain, authLoading]);

  async function loadCaptainData() {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    const supabase = createClient();
    
    try {
      // Get team and season in parallel
      const [teamResult, seasonResult] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name, short_name, logo_url, primary_color, secondary_color")
          .eq("captain_id", user.id)
          .single(),
        supabase
          .from("seasons")
          .select("id, name, status")
          .in("status", ["active", "playoffs"])
          .order("start_date", { ascending: false })
          .limit(1)
          .single()
      ]);

      const teamData = teamResult.data;
      const seasonData = seasonResult.data;

      if (!teamData) {
        setLoading(false);
        return;
      }

      setTeam(teamData);
      setSeason(seasonData);

      // Check for active draft (only from active/draft/playoffs seasons, not archived/completed)
      const { data: draftData } = await supabase
        .from("drafts")
        .select(`
          id,
          status,
          current_pick,
          draft_link,
          season:seasons!drafts_season_id_fkey(name, status)
        `)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(10); // Get multiple to filter by season status

      // Filter to only show drafts from active seasons (not archived/completed)
      const activeDrafts = (draftData || []).filter((draft: any) => 
        draft.season?.status && 
        ["active", "draft", "playoffs"].includes(draft.season.status)
      );

      if (activeDrafts.length > 0) {
        setActiveDraft(activeDrafts[0] as unknown as ActiveDraft);
      }

      // Get roster, pending stats, team stats, and games in parallel
      if (seasonData) {
        const [rosterResult, pendingResult, statsResult, gamesResult] = await Promise.all([
          getRosterWithStats(teamData.id, seasonData.id),
          getPendingVerificationsCount(teamData.id, seasonData.id),
          getTeamStatsSummary(teamData.id, seasonData.id),
          getGamesNeedingStats(teamData.id)
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRoster((rosterResult.roster || []) as any as RosterPlayer[]);
        setUpcomingGame(rosterResult.upcomingGame || null);
        setPendingStats(pendingResult.count);
        setTeamStats(statsResult);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setGames((gamesResult.games || []) as any as GameForStats[]);
      }
    } catch (error) {
      console.error("Captain data error:", error);
    }

    setLoading(false);
  }

  async function handleUpdateAvailability(playerId: string, status: "available" | "unavailable" | "maybe") {
    if (!upcomingGame || !team) return;
    
    setUpdatingAvailability(playerId);
    const result = await setPlayerAvailabilityAsCaptain(
      upcomingGame.id,
      playerId,
      team.id,
      status
    );
    setUpdatingAvailability(null);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Attendance updated");
      loadCaptainData();
    }
  }

  async function handleRequestSubs(gameId: string) {
    setRequestingSubs(gameId);
    const result = await requestSubsForGame(gameId);
    setRequestingSubs(null);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Sub players can now check in for this game!");
      loadCaptainData();
    }
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

  if (authLoading || loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isCaptain) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You are not currently a team captain.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t been assigned to a team yet. Contact the league owner.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort roster: goalies first, then by jersey number
  const sortedRoster = [...roster].sort((a, b) => {
    if (a.is_goalie && !b.is_goalie) return -1;
    if (!a.is_goalie && b.is_goalie) return 1;
    const aNum = a.player.jersey_number ?? 999;
    const bNum = b.player.jersey_number ?? 999;
    return aNum - bNum;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <TeamLogo team={team} size="xl" />
        <div>
          <Link href={`/teams/${team.id}`}>
            <h1 className="text-3xl font-bold hover:underline cursor-pointer">{team.name}</h1>
          </Link>
          <p className="text-muted-foreground">
            Captain&apos;s Dashboard
            {season && <span className="ml-2">• {season.name}</span>}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Roster Size</CardDescription>
            <CardTitle className="text-3xl">{roster.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {roster.filter(r => r.is_goalie).length} goalies
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Season Status</CardDescription>
            <CardTitle className="text-xl">
              {season?.status === "playoffs" ? (
                <Badge className="bg-gold text-puck-black">🏆 Playoffs</Badge>
              ) : season?.status === "active" ? (
                <Badge className="bg-green-600">🏒 Active</Badge>
              ) : (
                <Badge variant="outline">No Season</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {season?.name || "No active season"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Stats</CardDescription>
            <CardTitle className="text-3xl text-yellow-500">{pendingStats}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Games to verify</p>
          </CardContent>
        </Card>
        {teamStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Team Record</CardDescription>
              <CardTitle className="text-xl">
                {teamStats.wins}-{teamStats.losses}-{teamStats.ties}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {teamStats.points} points • {teamStats.goalsFor} GF / {teamStats.goalsAgainst} GA
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team Page</CardDescription>
            <CardTitle className="text-lg">
              <Link href={`/teams/${team.id}`} className="text-canada-red hover:underline">
                View Public Page →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">See how fans see your team</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Draft Banner */}
      {activeDraft && (
        <Card className="border-rink-blue bg-rink-blue/10 animate-pulse-slow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎯</span>
                <div>
                  <CardTitle className="text-rink-blue">Draft In Progress!</CardTitle>
                  <CardDescription>
                    {activeDraft.season?.name} • Pick #{activeDraft.current_pick}
                  </CardDescription>
                </div>
              </div>
              <Badge 
                className={activeDraft.status === "in_progress" 
                  ? "bg-green-600 animate-pulse" 
                  : "bg-yellow-600"
                }
              >
                {activeDraft.status === "in_progress" ? "LIVE" : "Pending"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {activeDraft.status === "in_progress" 
                  ? "The draft is active! Make your picks now."
                  : "The draft is set up and waiting to begin."}
              </p>
              <Button 
                className="bg-rink-blue hover:bg-rink-blue/90 w-full sm:w-auto"
                size="lg"
                asChild
              >
                <Link href={activeDraft.draft_link 
                  ? `/captain/draft?draft=${activeDraft.draft_link}` 
                  : "/captain/draft"
                }>
                  🏒 Go to Draft Board →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Games Section */}
      <GamesSection 
        games={games}
        team={team}
        onEnterStats={(gameId) => setSelectedGameId(gameId)}
        onRequestSubs={handleRequestSubs}
        requestingSubs={requestingSubs}
        userId={user?.id}
      />

      {/* Stat Entry Modal */}
      {selectedGameId && (
        <GameStatEntryModal
          gameId={selectedGameId}
          isOpen={!!selectedGameId}
          onClose={() => setSelectedGameId(null)}
          onSuccess={() => {
            setSelectedGameId(null);
            loadCaptainData();
          }}
        />
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button className="h-auto py-4 flex-col gap-2" variant="outline" asChild>
              <Link href={`/teams/${team.id}`}>
                <span className="text-2xl">👥</span>
                <span>View Full Roster</span>
              </Link>
            </Button>
            <Button className="h-auto py-4 flex-col gap-2" variant="outline" asChild>
              <Link href="/captain/team">
                <span className="text-2xl">📋</span>
                <span>Team Management</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Roster */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Roster</CardTitle>
              <CardDescription>
                {season?.name || "Current"} season roster
                {upcomingGame && (
                  <span className="ml-2 text-rink-blue">
                    • Next game: {new Date(upcomingGame.scheduledAt).toLocaleDateString("en-CA", { 
                      weekday: "short", month: "short", day: "numeric" 
                    })}
                  </span>
                )}
              </CardDescription>
            </div>
            {upcomingGame && (
              <Badge variant="outline" className="text-rink-blue border-rink-blue">
                {roster.filter(r => r.availability?.status === "available").length} / {roster.length} Available
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No players on your roster yet. Contact the league owner to add players.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Pos</TableHead>
                    <TableHead className="text-center">Shot</TableHead>
                    <TableHead className="text-center">GP</TableHead>
                    <TableHead className="text-center">G</TableHead>
                    <TableHead className="text-center">A</TableHead>
                    <TableHead className="text-center">Pts</TableHead>
                    <TableHead className="text-center">Att%</TableHead>
                    {upcomingGame && <TableHead className="text-center min-w-[120px]">Next Game</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRoster.map((rosterEntry) => {
                    const isGoalie = rosterEntry.is_goalie;
                    const stats = rosterEntry.stats;
                    const goalieStats = rosterEntry.goalieStats;
                    const availability = rosterEntry.availability;
                    
                    return (
                      <TableRow key={rosterEntry.id} className={availability?.status === "unavailable" ? "opacity-50" : ""}>
                        <TableCell className="font-mono font-bold text-lg">
                          {rosterEntry.player.jersey_number ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Link 
                            href={`/stats/${rosterEntry.player.id}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={rosterEntry.player.avatar_url || ""} />
                              <AvatarFallback 
                                className="text-xs"
                                style={{ backgroundColor: team.primary_color || "#3b82f6", color: team.secondary_color || "#ffffff" }}
                              >
                                {getInitials(rosterEntry.player.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium block">
                                {rosterEntry.player.full_name || "Unknown"}
                              </span>
                              {rosterEntry.player.id === user?.id && (
                                <Badge variant="outline" className="text-xs">Captain</Badge>
                              )}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          {isGoalie ? (
                            <Badge className="bg-rink-blue">G</Badge>
                          ) : rosterEntry.player.position ? (
                            <Badge variant="secondary">{rosterEntry.player.position}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {rosterEntry.player.shot_hand ? (
                            <Badge variant="outline" className="text-xs">
                              {rosterEntry.player.shot_hand === "left" ? "L" : "R"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {isGoalie ? (goalieStats?.gamesPlayed || 0) : stats.gamesPlayed}
                        </TableCell>
                        <TableCell className="text-center">
                          {isGoalie ? (
                            <span className="text-xs text-muted-foreground" title="Goals Against">
                              {goalieStats?.goalsAgainst || 0} GA
                            </span>
                          ) : (
                            <span className={stats.goals > 0 ? "font-bold text-gold" : ""}>
                              {stats.goals}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isGoalie ? (
                            <span className="text-xs text-muted-foreground" title="Saves">
                              {goalieStats?.saves || 0} SV
                            </span>
                          ) : (
                            <span className={stats.assists > 0 ? "font-medium" : ""}>
                              {stats.assists}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {isGoalie ? (
                            <span className="text-xs" title="Save %">
                              {goalieStats && (goalieStats.saves + goalieStats.goalsAgainst) > 0
                                ? `${((goalieStats.saves / (goalieStats.saves + goalieStats.goalsAgainst)) * 100).toFixed(0)}%`
                                : "-"}
                            </span>
                          ) : (
                            <span className={stats.points > 0 ? "text-gold" : ""}>
                              {stats.points}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={
                            stats.attendanceRate >= 80 ? "text-green-600 font-medium" :
                            stats.attendanceRate >= 50 ? "text-yellow-600" :
                            stats.attendanceRate > 0 ? "text-red-500" : "text-muted-foreground"
                          }>
                            {stats.attendanceRate > 0 ? `${stats.attendanceRate}%` : "-"}
                          </span>
                        </TableCell>
                        {upcomingGame && (
                          <TableCell className="text-center">
                            <Select
                              value={availability?.status || ""}
                              onValueChange={(value) => handleUpdateAvailability(
                                rosterEntry.player.id, 
                                value as "available" | "unavailable" | "maybe"
                              )}
                              disabled={updatingAvailability === rosterEntry.player.id}
                            >
                              <SelectTrigger className={`w-[100px] h-8 text-xs ${
                                availability?.status === "available" ? "border-green-500 bg-green-500/10" :
                                availability?.status === "unavailable" ? "border-red-500 bg-red-500/10" :
                                availability?.status === "maybe" ? "border-yellow-500 bg-yellow-500/10" :
                                ""
                              }`}>
                                <SelectValue placeholder="Not set">
                                  {availability?.status === "available" ? "✓ In" :
                                   availability?.status === "unavailable" ? "✗ Out" :
                                   availability?.status === "maybe" ? "? Maybe" :
                                   "Not set"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="available">
                                  <span className="text-green-600">✓ In</span>
                                </SelectItem>
                                <SelectItem value="maybe">
                                  <span className="text-yellow-600">? Maybe</span>
                                </SelectItem>
                                <SelectItem value="unavailable">
                                  <span className="text-red-600">✗ Out</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span><strong>GP</strong> = Games Played</span>
            <span><strong>G</strong> = Goals</span>
            <span><strong>A</strong> = Assists</span>
            <span><strong>Pts</strong> = Points</span>
            <span><strong>Att%</strong> = Attendance Rate</span>
            {roster.some(r => r.is_goalie) && (
              <>
                <span><strong>GA</strong> = Goals Against</span>
                <span><strong>SV</strong> = Saves</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Games Section Component
function GamesSection({
  games,
  team,
  onEnterStats,
  onRequestSubs,
  requestingSubs,
  userId,
}: {
  games: GameForStats[];
  team: TeamData;
  onEnterStats: (gameId: string) => void;
  onRequestSubs: (gameId: string) => void;
  requestingSubs: string | null;
  userId?: string;
}) {
  const [showPastGames, setShowPastGames] = useState(false);

  // Categorize games
  const today = new Date();
  const todayStr = today.toDateString();

  // Today's games (scheduled, in_progress, or completed today)
  const todaysGames = games.filter(g => {
    const gameDate = new Date(g.scheduled_at);
    return gameDate.toDateString() === todayStr;
  });

  // Today's games that are completed and need stats
  const todaysCompletedNeedingStats = todaysGames.filter(g => 
    g.status === "completed" && !g.hasStats
  );

  // Today's games that are not yet completed (upcoming/in progress)
  const todaysUpcoming = todaysGames.filter(g => 
    g.status !== "completed"
  );

  // Past games that still need stats (before today)
  const pastGamesNeedingStats = games.filter(g => {
    const gameDate = new Date(g.scheduled_at);
    return gameDate.toDateString() !== todayStr && 
           gameDate < today && 
           g.status === "completed" && 
           !g.hasStats;
  });

  // Future games (after today)
  const upcomingGames = games.filter(g => {
    const gameDate = new Date(g.scheduled_at);
    return gameDate.toDateString() !== todayStr && 
           gameDate > today && 
           g.status === "scheduled";
  }).slice(0, 3);

  // Games needing verification (any time)
  const needingVerification = games.filter(g => {
    if (g.isHomeTeam) {
      return g.status === "completed" && g.hasStats && !g.home_captain_verified && g.away_captain_verified;
    } else {
      return g.status === "completed" && g.hasStats && !g.away_captain_verified && g.home_captain_verified;
    }
  });

  const getGameStatus = (game: GameForStats) => {
    if (game.status === "in_progress") return { label: "LIVE", color: "bg-green-600 animate-pulse" };
    if (game.status === "completed") {
      if (!game.hasStats) return { label: "Needs Stats", color: "bg-canada-red" };
      const needsVerify = game.isHomeTeam 
        ? !game.home_captain_verified && game.away_captain_verified
        : !game.away_captain_verified && game.home_captain_verified;
      if (needsVerify) return { label: "Verify", color: "bg-yellow-600" };
      const verified = game.isHomeTeam ? game.home_captain_verified : game.away_captain_verified;
      if (verified) return { label: "Verified", color: "bg-green-600" };
      return { label: "Pending", color: "bg-gray-500" };
    }
    return { label: "Upcoming", color: "bg-rink-blue" };
  };

  const formatGameTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
  };

  const formatGameDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
  };

  if (games.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Games</CardTitle>
          <CardDescription>No games found for this season</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Games will appear here once the schedule is created.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Today's Games - Main Focus */}
      {todaysGames.length > 0 && (
        <Card className="border-2 border-rink-blue bg-rink-blue/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🏒</span>
              Today&apos;s Game
              <Badge className="bg-rink-blue">Game Day!</Badge>
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Upcoming/In Progress games today */}
              {todaysUpcoming.map((game) => {
                const opponent = game.isHomeTeam ? game.away_team : game.home_team;
                const status = getGameStatus(game);
                const subsRequested = game.isHomeTeam ? game.home_subs_requested : game.away_subs_requested;

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 bg-background rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-bold">{formatGameTime(game.scheduled_at)}</p>
                      </div>
                      <div>
                        <p className="font-semibold">vs {opponent?.name || "TBD"}</p>
                        <p className="text-sm text-muted-foreground">
                          {game.isHomeTeam ? "Home" : "Away"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>{status.label}</Badge>
                      {!subsRequested && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRequestSubs(game.id)}
                          disabled={requestingSubs === game.id}
                        >
                          {requestingSubs === game.id ? "..." : "Request Subs"}
                        </Button>
                      )}
                      {subsRequested && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Subs Requested
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Today's completed games needing stats - PRIMARY FOCUS */}
              {todaysCompletedNeedingStats.map((game) => {
                const opponent = game.isHomeTeam ? game.away_team : game.home_team;
                const score = game.home_score !== null && game.away_score !== null
                  ? game.isHomeTeam 
                    ? `${game.home_score} - ${game.away_score}`
                    : `${game.away_score} - ${game.home_score}`
                  : null;

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 bg-canada-red/10 rounded-lg border-2 border-canada-red"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm text-muted-foreground">{formatGameTime(game.scheduled_at)}</p>
                        <Badge className="bg-canada-red">FINAL</Badge>
                      </div>
                      <div>
                        <p className="font-semibold">vs {opponent?.name || "TBD"}</p>
                        {score && <p className="text-lg font-bold">{score}</p>}
                      </div>
                    </div>
                    <Button
                      onClick={() => onEnterStats(game.id)}
                      className="bg-canada-red hover:bg-canada-red-dark"
                      size="lg"
                    >
                      📊 Enter Stats
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Games Needing Verification */}
      {needingVerification.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <span className="text-2xl">✓</span>
              Verify Stats
              <Badge className="bg-yellow-600">{needingVerification.length}</Badge>
            </CardTitle>
            <CardDescription>
              Review and verify the opponent&apos;s submitted stats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needingVerification.map((game) => {
                const opponent = game.isHomeTeam ? game.away_team : game.home_team;
                const score = game.isHomeTeam 
                  ? `${game.home_score} - ${game.away_score}`
                  : `${game.away_score} - ${game.home_score}`;

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground min-w-[80px]">
                        {formatGameDate(game.scheduled_at)}
                      </div>
                      <div>
                        <p className="font-medium">vs {opponent?.name || "TBD"}</p>
                        <p className="text-sm text-muted-foreground">Final: {score}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => onEnterStats(game.id)}
                      variant="outline"
                      size="sm"
                    >
                      Review & Verify
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Games Needing Stats - Collapsible */}
      {pastGamesNeedingStats.length > 0 && (
        <Card className={showPastGames ? "border-canada-red/50" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xl">📁</span>
                Past Games
                <Badge variant="outline">{pastGamesNeedingStats.length} need stats</Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPastGames(!showPastGames)}
              >
                {showPastGames ? "Hide" : "View Past Games"}
              </Button>
            </div>
          </CardHeader>
          {showPastGames && (
            <CardContent>
              <div className="space-y-2">
                {pastGamesNeedingStats.map((game) => {
                  const opponent = game.isHomeTeam ? game.away_team : game.home_team;
                  const score = game.home_score !== null && game.away_score !== null
                    ? game.isHomeTeam 
                      ? `${game.home_score} - ${game.away_score}`
                      : `${game.away_score} - ${game.home_score}`
                    : "TBD";

                  return (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground min-w-[80px]">
                          {formatGameDate(game.scheduled_at)}
                        </div>
                        <div>
                          <p className="font-medium">vs {opponent?.name || "TBD"}</p>
                          {score !== "TBD" && (
                            <p className="text-sm text-muted-foreground">Score: {score}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => onEnterStats(game.id)}
                        variant="outline"
                        size="sm"
                      >
                        Enter Stats
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Upcoming Games */}
      {upcomingGames.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Upcoming Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingGames.map((game) => {
                const opponent = game.isHomeTeam ? game.away_team : game.home_team;
                const subsRequested = game.isHomeTeam ? game.home_subs_requested : game.away_subs_requested;

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm min-w-[100px]">
                        <p className="font-medium">{formatGameDate(game.scheduled_at)}</p>
                        <p className="text-muted-foreground">{formatGameTime(game.scheduled_at)}</p>
                      </div>
                      <div>
                        <p className="font-medium">vs {opponent?.name || "TBD"}</p>
                        <p className="text-xs text-muted-foreground">
                          {game.isHomeTeam ? "Home" : "Away"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {subsRequested ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Subs Requested
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRequestSubs(game.id)}
                          disabled={requestingSubs === game.id}
                        >
                          {requestingSubs === game.id ? "..." : "Need Subs?"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No games message */}
      {todaysGames.length === 0 && needingVerification.length === 0 && pastGamesNeedingStats.length === 0 && upcomingGames.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              All caught up! No games need attention right now.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No game today but nothing else to do */}
      {todaysGames.length === 0 && needingVerification.length === 0 && pastGamesNeedingStats.length === 0 && upcomingGames.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-6 text-center">
            <p className="text-2xl mb-2">📅</p>
            <p className="text-muted-foreground">
              No game today. Next game: {formatGameDate(upcomingGames[0].scheduled_at)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
