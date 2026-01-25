"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamLogo } from "@/components/ui/team-logo";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
  short_name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

type Game = {
  id: string;
  scheduled_at: string;
  status: string;
  location?: string | null;
  home_score: number;
  away_score: number;
  home_team_id: string;
  away_team_id: string;
  home_team: Team | null;
  away_team: Team | null;
};

type Season = {
  id: string;
  name: string;
  status: string;
};

type ScheduleViewProps = {
  upcomingGames: Game[];
  recentGames: Game[];
  teams: Team[];
  seasons?: Season[];
  currentSeasonId?: string;
  activeSeason?: Season | null;
  showSeasonSelector?: boolean;
};

export function ScheduleView({ 
  upcomingGames, 
  recentGames, 
  teams,
  seasons = [],
  currentSeasonId,
  activeSeason,
  showSeasonSelector = false,
}: ScheduleViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  
  // Fetch user's team from roster for active season
  useEffect(() => {
    async function fetchUserTeam() {
      if (!user?.id) {
        setUserTeamId(null);
        return;
      }

      const supabase = createClient();
      
      // Get active season
      const { data: activeSeason } = await supabase
        .from("seasons")
        .select("id")
        .in("status", ["active", "playoffs"])
        .order("start_date", { ascending: false })
        .limit(1)
        .single();

      if (!activeSeason) {
        setUserTeamId(null);
        return;
      }

      // Get user's team for active season
      const { data: rosterEntry } = await supabase
        .from("team_rosters")
        .select("team_id")
        .eq("player_id", user.id)
        .eq("season_id", activeSeason.id)
        .single();

      if (rosterEntry) {
        setUserTeamId(rosterEntry.team_id);
      } else {
        setUserTeamId(null);
      }
    }

    fetchUserTeam();
  }, [user?.id]);

  // Filter games based on selection
  const filteredUpcoming = useMemo(() => {
    if (selectedTeamId === "all") return upcomingGames;
    return upcomingGames.filter(
      (game) => game.home_team_id === selectedTeamId || game.away_team_id === selectedTeamId
    );
  }, [upcomingGames, selectedTeamId]);

  const filteredRecent = useMemo(() => {
    if (selectedTeamId === "all") return recentGames;
    return recentGames.filter(
      (game) => game.home_team_id === selectedTeamId || game.away_team_id === selectedTeamId
    );
  }, [recentGames, selectedTeamId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline">📅 Scheduled</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-600">⏱️ Live</Badge>;
      case "completed":
        return <Badge className="bg-green-600">✓ Final</Badge>;
      case "cancelled":
        return <Badge variant="destructive">❌ Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatGameDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  };

  const renderGame = (game: Game) => {
    const { date, time } = formatGameDate(game.scheduled_at);
    const isUserGame = userTeamId && (game.home_team_id === userTeamId || game.away_team_id === userTeamId);
    
    return (
      <Card 
        key={game.id} 
        className={`hover:border-canada-red/50 transition-all ${isUserGame ? "border-rink-blue ring-1 ring-rink-blue/30 bg-rink-blue/5" : ""}`}
      >
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Date/Time - Mobile Row */}
            <div className="flex items-center justify-between md:flex-col md:items-start md:w-28 border-b md:border-b-0 pb-3 md:pb-0">
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{date}</div>
                <div className="text-lg font-bold">{time}</div>
              </div>
              <div className="md:mt-1">
                {game.status !== "scheduled" ? getStatusBadge(game.status) : (
                  game.location && (
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      📍 {game.location}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Teams Matchup */}
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 py-2 md:py-0">
              {/* Home Team */}
              <div className="flex-1 flex items-center justify-center sm:justify-end gap-3 w-full">
                <span className="font-bold text-base md:text-lg sm:order-first order-last text-right sm:text-left flex-1 sm:flex-none truncate">
                  {game.home_team?.name || "TBD"}
                </span>
                <TeamLogo 
                  team={game.home_team} 
                  size="md" 
                />
              </div>

              {/* VS / Score Divider */}
              <div className="flex items-center gap-4 sm:gap-2 w-full sm:w-auto">
                <div className="h-px bg-border flex-1 sm:hidden" />
                <div className="bg-muted px-4 py-1.5 rounded-full text-sm font-bold min-w-[60px] text-center">
                  {game.status === "completed" ? (
                    <span className="font-mono text-lg">{game.home_score} - {game.away_score}</span>
                  ) : "VS"}
                </div>
                <div className="h-px bg-border flex-1 sm:hidden" />
              </div>

              {/* Away Team */}
              <div className="flex-1 flex items-center justify-center sm:justify-start gap-3 w-full">
                <TeamLogo 
                  team={game.away_team} 
                  size="md" 
                />
                <span className="font-bold text-base md:text-lg text-left flex-1 sm:flex-none truncate">
                  {game.away_team?.name || "TBD"}
                </span>
              </div>
            </div>

            {/* Desktop Actions/Status */}
            <div className="hidden md:flex flex-col items-end gap-2">
              {isUserGame && (
                <Badge variant="secondary" className="bg-rink-blue/20 text-rink-blue border-rink-blue/30">
                  My Team
                </Badge>
              )}
              {game.status === "scheduled" && getStatusBadge(game.status)}
            </div>

            {/* Mobile "My Team" indicator */}
            {isUserGame && (
              <div className="md:hidden text-center">
                <Badge variant="secondary" className="bg-rink-blue text-white w-full py-1">
                  Your Game
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRecentGame = (game: Game) => {
    const { date, time } = formatGameDate(game.scheduled_at);
    const isUserGame = userTeamId && (game.home_team_id === userTeamId || game.away_team_id === userTeamId);
    
    // Determine if user's team won/lost
    let userResult = "";
    if (isUserGame && game.status === "completed") {
      const isHome = game.home_team_id === userTeamId;
      const userScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      if (userScore > oppScore) userResult = "W";
      else if (userScore < oppScore) userResult = "L";
      else userResult = "T";
    }
    
    return (
      <Card 
        key={game.id} 
        className={`hover:border-canada-red/50 transition-all ${isUserGame ? "border-rink-blue ring-1 ring-rink-blue/30 bg-rink-blue/5" : ""}`}
      >
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Date/Time - Mobile Row */}
            <div className="flex items-center justify-between md:flex-col md:items-start md:w-28 border-b md:border-b-0 pb-3 md:pb-0">
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{date}</div>
                <div className="text-lg font-bold">{time}</div>
              </div>
              <div className="md:mt-1">
                {getStatusBadge(game.status)}
              </div>
            </div>

            {/* Teams Matchup & Score */}
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 py-2 md:py-0">
              {/* Home Team */}
              <div className="flex-1 flex items-center justify-center sm:justify-end gap-3 w-full">
                <span className="font-bold text-base md:text-lg sm:order-first order-last text-right sm:text-left flex-1 sm:flex-none truncate">
                  {game.home_team?.name || "TBD"}
                </span>
                <TeamLogo 
                  team={game.home_team} 
                  size="md" 
                />
              </div>

              {/* Score Divider */}
              <div className="flex flex-col items-center gap-1 w-full sm:w-auto">
                <div className="flex items-center gap-4 sm:gap-2 w-full sm:w-auto">
                  <div className="h-px bg-border flex-1 sm:hidden" />
                  <div className="bg-puck-black text-white px-4 py-1.5 rounded-lg text-xl font-mono font-bold min-w-[80px] text-center shadow-lg border border-white/10">
                    {game.home_score} - {game.away_score}
                  </div>
                  <div className="h-px bg-border flex-1 sm:hidden" />
                </div>
                {isUserGame && userResult && (
                  <Badge className={`${
                    userResult === "W" ? "bg-green-600" : 
                    userResult === "L" ? "bg-red-600" : "bg-slate-600"
                  } text-[10px] h-4 px-2 uppercase font-black tracking-tighter`}>
                    {userResult === "W" ? "Victory" : userResult === "L" ? "Loss" : "Tie"}
                  </Badge>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 flex items-center justify-center sm:justify-start gap-3 w-full">
                <TeamLogo 
                  team={game.away_team} 
                  size="md" 
                />
                <span className="font-bold text-base md:text-lg text-left flex-1 sm:flex-none truncate">
                  {game.away_team?.name || "TBD"}
                </span>
              </div>
            </div>

            {/* Desktop "My Team" indicator */}
            <div className="hidden md:flex flex-col items-end gap-2">
              {isUserGame && (
                <Badge variant="secondary" className="bg-rink-blue/20 text-rink-blue border-rink-blue/30">
                  My Team
                </Badge>
              )}
            </div>

            {/* Mobile "My Team" indicator */}
            {isUserGame && (
              <div className="md:hidden text-center">
                <Badge variant="secondary" className="bg-rink-blue text-white w-full py-1">
                  Your Game
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Handle season change
  const handleSeasonChange = (seasonId: string) => {
    if (seasonId === "current" && activeSeason) {
      router.push("/schedule");
    } else {
      router.push(`/schedule?season=${seasonId}`);
    }
  };

  return (
    <>
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Season Selector */}
        {showSeasonSelector && seasons.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground">Season:</span>
            <Select 
              value={currentSeasonId || "current"} 
              onValueChange={handleSeasonChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Season" />
              </SelectTrigger>
              <SelectContent>
                {activeSeason && (
                  <SelectItem value="current">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600 text-[10px] px-1">Active</Badge>
                      {activeSeason.name}
                    </div>
                  </SelectItem>
                )}
                {seasons.filter(s => s.id !== activeSeason?.id).map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    <div className="flex items-center gap-2">
                      {season.status === "completed" && (
                        <Badge variant="outline" className="text-[10px] px-1">Past</Badge>
                      )}
                      {season.status === "playoffs" && (
                        <Badge className="bg-gold text-puck-black text-[10px] px-1">Playoffs</Badge>
                      )}
                      {season.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <span className="text-sm text-muted-foreground">Team:</span>
        
        {/* My Schedule Button - only show if user has a team */}
        {userTeamId && (
          <Button
            variant={selectedTeamId === userTeamId ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTeamId(selectedTeamId === userTeamId ? "all" : userTeamId)}
            className={selectedTeamId === userTeamId ? "bg-rink-blue hover:bg-rink-blue/90" : ""}
          >
            ⛸️ My Schedule
          </Button>
        )}
        
        {/* Team Dropdown */}
        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                <div className="flex items-center gap-2">
                  {team.logo_url ? (
                    <div 
                      className="w-4 h-4 rounded overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: team.primary_color || "#3b82f6" }}
                    >
                      <img 
                        src={team.logo_url} 
                        alt="" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                      style={{ 
                        backgroundColor: team.primary_color || "#3b82f6",
                        color: team.secondary_color || "#ffffff"
                      }}
                    >
                      {team.short_name}
                    </div>
                  )}
                  {team.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTeamId !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTeamId("all")}
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Games Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({filteredUpcoming.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Recent Results ({filteredRecent.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {filteredUpcoming.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {selectedTeamId !== "all" 
                    ? "No upcoming games for this team." 
                    : "No upcoming games scheduled. Check back soon!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredUpcoming.map(renderGame)
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {filteredRecent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {selectedTeamId !== "all" 
                    ? "No recent games for this team." 
                    : "No recent games. Check back after games are played!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRecent.map(renderRecentGame)
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
