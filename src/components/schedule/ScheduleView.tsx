"use client";

import { useState, useMemo, useEffect } from "react";
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

type ScheduleViewProps = {
  upcomingGames: Game[];
  recentGames: Game[];
  teams: Team[];
};

export function ScheduleView({ upcomingGames, recentGames, teams }: ScheduleViewProps) {
  const { profile, user } = useAuth();
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
        className={`hover:border-canada-red/50 transition-colors ${isUserGame ? "border-rink-blue ring-1 ring-rink-blue/30" : ""}`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Date/Time */}
            <div className="flex-shrink-0 text-center md:text-left md:w-28">
              <div className="text-sm text-muted-foreground">{date}</div>
              <div className="text-lg font-semibold">{time}</div>
              {game.location && (
                <div className="text-xs text-muted-foreground mt-1">
                  📍 {game.location}
                </div>
              )}
            </div>

            {/* Teams & Score */}
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1 flex items-center justify-end gap-2">
                {game.home_team ? (
                  <TeamLogo 
                    team={game.home_team} 
                    size="sm" 
                    showName 
                    nameClassName="text-lg font-semibold"
                  />
                ) : (
                  <span className="font-semibold text-lg">TBD</span>
                )}
              </div>

              <div className="text-center min-w-[80px]">
                {game.status === "completed" ? (
                  <div className="font-mono font-bold text-xl">
                    {game.home_score} - {game.away_score}
                  </div>
                ) : (
                  <div className="text-muted-foreground">vs</div>
                )}
              </div>

              <div className="flex-1 flex items-center gap-2">
                {game.away_team ? (
                  <TeamLogo 
                    team={game.away_team} 
                    size="sm" 
                    showName 
                    nameClassName="text-lg font-semibold"
                  />
                ) : (
                  <span className="font-semibold text-lg">TBD</span>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {isUserGame && (
                <Badge variant="secondary" className="bg-rink-blue/20 text-rink-blue">
                  My Team
                </Badge>
              )}
              {getStatusBadge(game.status)}
            </div>
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
        className={`hover:border-canada-red/50 transition-colors ${isUserGame ? "border-rink-blue ring-1 ring-rink-blue/30" : ""}`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Date/Time */}
            <div className="flex-shrink-0 text-center md:text-left md:w-28">
              <div className="text-sm text-muted-foreground">{date}</div>
              <div className="text-lg font-semibold">{time}</div>
              {game.location && (
                <div className="text-xs text-muted-foreground mt-1">
                  📍 {game.location}
                </div>
              )}
            </div>

            {/* Teams & Score */}
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1 flex items-center justify-end gap-2">
                {game.home_team ? (
                  <TeamLogo 
                    team={game.home_team} 
                    size="sm" 
                    showName 
                    nameClassName="text-lg font-semibold"
                  />
                ) : (
                  <span className="font-semibold text-lg">TBD</span>
                )}
              </div>

              <div className="text-center min-w-[80px]">
                <div className="font-mono font-bold text-xl">
                  {game.home_score} - {game.away_score}
                </div>
                {isUserGame && userResult && (
                  <div className={`text-xs font-medium mt-1 ${
                    userResult === "W" ? "text-green-500" : 
                    userResult === "L" ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {userResult === "W" ? "Win" : userResult === "L" ? "Loss" : "Tie"}
                  </div>
                )}
              </div>

              <div className="flex-1 flex items-center gap-2">
                {game.away_team ? (
                  <TeamLogo 
                    team={game.away_team} 
                    size="sm" 
                    showName 
                    nameClassName="text-lg font-semibold"
                  />
                ) : (
                  <span className="font-semibold text-lg">TBD</span>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {isUserGame && (
                <Badge variant="secondary" className="bg-rink-blue/20 text-rink-blue">
                  My Team
                </Badge>
              )}
              {getStatusBadge(game.status)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm text-muted-foreground">Filter by:</span>
        
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
