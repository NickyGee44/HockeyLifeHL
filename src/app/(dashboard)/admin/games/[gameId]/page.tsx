"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MatchupHeader } from "@/components/schedule/MatchupHeader";
import { PlayerStatsComparison } from "@/components/schedule/PlayerStatsComparison";
import { RescheduleDialog } from "@/components/schedule/RescheduleDialog";
import { CancelGameDialog } from "@/components/schedule/CancelGameDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Calendar, X, Clock, MapPin, Users } from "lucide-react";
import { parseISO, format } from "date-fns";

/**
 * Game Detail Page
 *
 * Comprehensive game details for admins.
 * Features:
 * - Matchup header with team logos, records, scores
 * - Player stats comparison (scoring/penalties/goalies)
 * - Reschedule history timeline
 * - Team rosters
 * - Admin actions (reschedule/cancel)
 *
 * Uses GET /api/[tenant]/games/[gameId] API
 */

type GameData = {
  game: {
    id: string;
    scheduledAt: string;
    status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
    homeTeam: {
      id: string;
      name: string;
      logoUrl?: string;
      score?: number;
      record?: { wins: number; losses: number; ties?: number };
    };
    awayTeam: {
      id: string;
      name: string;
      logoUrl?: string;
      score?: number;
      record?: { wins: number; losses: number; ties?: number };
    };
    venue?: {
      id: string;
      name: string;
      address?: string;
    };
    division?: {
      id: string;
      name: string;
    };
    rosters: {
      home: Array<{
        playerId: string;
        playerName: string;
        jerseyNumber?: string;
        position?: string;
      }>;
      away: Array<{
        playerId: string;
        playerName: string;
        jerseyNumber?: string;
        position?: string;
      }>;
    };
    playerStats: {
      home: Array<{
        playerId: string;
        playerName: string;
        jerseyNumber?: string;
        goals?: number;
        assists?: number;
        points?: number;
        penaltyMinutes?: number;
      }>;
      away: Array<{
        playerId: string;
        playerName: string;
        jerseyNumber?: string;
        goals?: number;
        assists?: number;
        points?: number;
        penaltyMinutes?: number;
      }>;
    };
    goalieStats: {
      home: Array<{
        playerId: string;
        playerName: string;
        jerseyNumber?: string;
        saves?: number;
        shotsAgainst?: number;
        goalsAgainst?: number;
      }>;
      away: Array<{
        playerId: string;
        playerName: string;
        jerseyNumber?: string;
        saves?: number;
        shotsAgainst?: number;
        goalsAgainst?: number;
      }>;
    };
    rescheduleHistory?: Array<{
      gameId: string;
      scheduledAt: string;
      status: string;
      rescheduleReason?: string;
      isOriginal: boolean;
      isCurrent: boolean;
    }>;
    seasonSeries?: {
      homeWins: number;
      awayWins: number;
      ties: number;
    };
  };
};

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const tenantSlug = "pilot"; // TODO: Get from context

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  /**
   * Fetch game details
   */
  const fetchGameDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/${tenantSlug}/games/${gameId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Game not found");
        }
        throw new Error("Failed to fetch game details");
      }

      const data = await response.json();
      setGameData(data);
    } catch (err) {
      console.error("Error fetching game:", err);
      setError(err instanceof Error ? err.message : "Failed to load game");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameDetails();
  }, [gameId]);

  /**
   * Handle successful reschedule/cancel
   */
  const handleActionSuccess = () => {
    fetchGameDetails(); // Refresh game data
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading game details...</p>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Game not found"}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const { game } = gameData;
  const canReschedule = game.status === "scheduled" || game.status === "postponed";
  const canCancel = game.status === "scheduled" || game.status === "postponed";

  return (
    <div className="space-y-6">
      {/* Matchup Header */}
      <MatchupHeader
        homeTeam={{
          id: game.homeTeam.id,
          name: game.homeTeam.name,
          logoUrl: game.homeTeam.logoUrl,
          score: game.homeTeam.score,
          record: game.homeTeam.record,
        }}
        awayTeam={{
          id: game.awayTeam.id,
          name: game.awayTeam.name,
          logoUrl: game.awayTeam.logoUrl,
          score: game.awayTeam.score,
          record: game.awayTeam.record,
        }}
        scheduledAt={parseISO(game.scheduledAt)}
        status={game.status}
        venue={game.venue}
        division={game.division}
        tenantSlug={tenantSlug}
      />

      {/* Admin Actions */}
      <div className="container mx-auto px-4">
        <div className="flex gap-2 justify-center">
          {canReschedule && (
            <Button onClick={() => setRescheduleDialogOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Reschedule Game
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" onClick={() => setCancelDialogOpen(true)}>
              <X className="mr-2 h-4 w-4" />
              Cancel Game
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 space-y-6">
        {/* Player Stats Tabs */}
        {game.status === "completed" && (
          <Card>
            <CardHeader>
              <CardTitle>Player Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="scoring">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="scoring">Scoring</TabsTrigger>
                  <TabsTrigger value="penalties">Penalties</TabsTrigger>
                  <TabsTrigger value="goalies">Goalies</TabsTrigger>
                </TabsList>
                <TabsContent value="scoring" className="mt-4">
                  <PlayerStatsComparison
                    homeTeam={{
                      id: game.homeTeam.id,
                      name: game.homeTeam.name,
                      players: game.playerStats.home,
                    }}
                    awayTeam={{
                      id: game.awayTeam.id,
                      name: game.awayTeam.name,
                      players: game.playerStats.away,
                    }}
                    statType="scoring"
                    tenantSlug={tenantSlug}
                  />
                </TabsContent>
                <TabsContent value="penalties" className="mt-4">
                  <PlayerStatsComparison
                    homeTeam={{
                      id: game.homeTeam.id,
                      name: game.homeTeam.name,
                      players: game.playerStats.home,
                    }}
                    awayTeam={{
                      id: game.awayTeam.id,
                      name: game.awayTeam.name,
                      players: game.playerStats.away,
                    }}
                    statType="penalties"
                    tenantSlug={tenantSlug}
                  />
                </TabsContent>
                <TabsContent value="goalies" className="mt-4">
                  <PlayerStatsComparison
                    homeTeam={{
                      id: game.homeTeam.id,
                      name: game.homeTeam.name,
                      players: game.goalieStats.home.map((g) => ({
                        ...g,
                        saves: g.saves,
                        shotsAgainst: g.shotsAgainst,
                        goalsAgainst: g.goalsAgainst,
                      })),
                    }}
                    awayTeam={{
                      id: game.awayTeam.id,
                      name: game.awayTeam.name,
                      players: game.goalieStats.away.map((g) => ({
                        ...g,
                        saves: g.saves,
                        shotsAgainst: g.shotsAgainst,
                        goalsAgainst: g.goalsAgainst,
                      })),
                    }}
                    statType="goalies"
                    tenantSlug={tenantSlug}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Team Rosters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {game.homeTeam.name} Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              {game.rosters.home.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No roster available
                </p>
              ) : (
                <div className="space-y-2">
                  {game.rosters.home.map((player) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {player.jerseyNumber && (
                          <Badge variant="secondary">#{player.jerseyNumber}</Badge>
                        )}
                        <span className="font-medium">{player.playerName}</span>
                      </div>
                      {player.position && (
                        <span className="text-sm text-muted-foreground">{player.position}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {game.awayTeam.name} Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              {game.rosters.away.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No roster available
                </p>
              ) : (
                <div className="space-y-2">
                  {game.rosters.away.map((player) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {player.jerseyNumber && (
                          <Badge variant="secondary">#{player.jerseyNumber}</Badge>
                        )}
                        <span className="font-medium">{player.playerName}</span>
                      </div>
                      {player.position && (
                        <span className="text-sm text-muted-foreground">{player.position}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reschedule History */}
        {game.rescheduleHistory && game.rescheduleHistory.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Reschedule History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {game.rescheduleHistory.map((entry, index) => (
                  <div
                    key={entry.gameId}
                    className="flex items-start gap-4 pb-4 border-b last:border-0"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {entry.isOriginal ? (
                        <Badge variant="outline">Original</Badge>
                      ) : entry.isCurrent ? (
                        <Badge>Current</Badge>
                      ) : (
                        <Badge variant="secondary">Rescheduled</Badge>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {format(parseISO(entry.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                      </p>
                      {entry.rescheduleReason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {entry.rescheduleReason}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        Status: {entry.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Season Series */}
        {game.seasonSeries && (
          <Card>
            <CardHeader>
              <CardTitle>Season Series</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{game.homeTeam.name}</p>
                  <p className="text-4xl font-bold">{game.seasonSeries.homeWins}</p>
                </div>
                <div className="text-2xl text-muted-foreground">-</div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{game.awayTeam.name}</p>
                  <p className="text-4xl font-bold">{game.seasonSeries.awayWins}</p>
                </div>
                {game.seasonSeries.ties > 0 && (
                  <>
                    <div className="text-2xl text-muted-foreground">-</div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Ties</p>
                      <p className="text-4xl font-bold">{game.seasonSeries.ties}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <RescheduleDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        gameId={gameId}
        currentScheduledAt={game.scheduledAt}
        currentVenue={game.venue}
        onSuccess={handleActionSuccess}
        tenantSlug={tenantSlug}
      />

      <CancelGameDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        gameId={gameId}
        scheduledAt={game.scheduledAt}
        homeTeamName={game.homeTeam.name}
        awayTeamName={game.awayTeam.name}
        onSuccess={handleActionSuccess}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
