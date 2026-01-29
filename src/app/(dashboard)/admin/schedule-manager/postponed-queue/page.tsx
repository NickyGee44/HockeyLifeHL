"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Calendar, ArrowLeft, Clock, MapPin } from "lucide-react";
import { RescheduleDialog } from "@/components/schedule/RescheduleDialog";
import { useActiveLeague } from "@/hooks/use-league";
import { format, parseISO } from "date-fns";

/**
 * Postponed Games Queue Page
 *
 * Admin dashboard showing all postponed games that need rescheduling.
 * Features:
 * - List of all postponed games
 * - Original scheduled date and reason for postponement
 * - Quick reschedule action per game
 * - Bulk selection for future bulk reschedule feature
 *
 * Uses Schedule API with status=postponed filter
 */

type PostponedGame = {
  id: string;
  originalScheduledAt: string;
  homeTeamName: string;
  awayTeamName: string;
  venueName?: string;
  divisionName?: string;
  postponedAt?: string;
  postponedBy?: string;
  cancellationReason?: string;
};

export default function PostponedQueuePage() {
  const router = useRouter();
  const { leagueSlug } = useActiveLeague();

  const [games, setGames] = useState<PostponedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reschedule dialog
  const [selectedGame, setSelectedGame] = useState<PostponedGame | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);

  /**
   * Fetch postponed games
   */
  const fetchPostponedGames = async () => {
    if (!leagueSlug) return; // Wait for league context to load

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/${leagueSlug}/schedule?status=postponed&limit=100`);

      if (!response.ok) {
        throw new Error("Failed to fetch postponed games");
      }

      const data = await response.json();
      setGames(
        data.games.map((g: any) => ({
          id: g.id,
          originalScheduledAt: g.scheduledAt,
          homeTeamName: g.homeTeam.name,
          awayTeamName: g.awayTeam.name,
          venueName: g.venue?.name,
          divisionName: g.division?.name,
          // TODO: These fields need to be added to API response
          postponedAt: g.cancelledAt,
          postponedBy: g.cancelledBy,
          cancellationReason: g.cancellationReason,
        }))
      );
    } catch (err) {
      console.error("Error fetching postponed games:", err);
      setError(err instanceof Error ? err.message : "Failed to load postponed games");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostponedGames();
  }, []);

  /**
   * Handle reschedule action
   */
  const handleReschedule = (game: PostponedGame) => {
    setSelectedGame(game);
    setRescheduleDialogOpen(true);
  };

  /**
   * Handle successful reschedule
   */
  const handleRescheduleSuccess = () => {
    fetchPostponedGames(); // Refresh list
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading postponed games...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Postponed Games Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Games that need to be rescheduled
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Postponed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{games.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {
                games.filter((g) => {
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  return g.postponedAt && parseISO(g.postponedAt) > weekAgo;
                }).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Urgent (Originally This Week)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {
                games.filter((g) => {
                  const originalDate = parseISO(g.originalScheduledAt);
                  const now = new Date();
                  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                  return originalDate >= now && originalDate <= weekFromNow;
                }).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!loading && !error && games.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Postponed Games</h3>
            <p className="text-muted-foreground">
              All games are scheduled or completed. Great job!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Postponed Games List */}
      {games.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Games Awaiting Reschedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {games.map((game) => {
              const isUrgent = (() => {
                const originalDate = parseISO(game.originalScheduledAt);
                const now = new Date();
                const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                return originalDate >= now && originalDate <= weekFromNow;
              })();

              return (
                <div
                  key={game.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    isUrgent ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Teams */}
                      <div>
                        <p className="font-semibold text-lg">
                          {game.homeTeamName} vs {game.awayTeamName}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                          {game.divisionName && (
                            <Badge variant="secondary" className="text-xs">
                              {game.divisionName}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Original Schedule */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            Originally:{" "}
                            {format(parseISO(game.originalScheduledAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        {game.venueName && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{game.venueName}</span>
                          </div>
                        )}
                      </div>

                      {/* Postpone Info */}
                      {game.cancellationReason && (
                        <div className="text-sm">
                          <span className="font-medium">Reason: </span>
                          <span className="text-muted-foreground">{game.cancellationReason}</span>
                        </div>
                      )}
                      {game.postponedAt && (
                        <div className="text-xs text-muted-foreground">
                          Postponed on {format(parseISO(game.postponedAt), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleReschedule(game)}
                        className="whitespace-nowrap"
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/games/${game.id}`)}
                        className="whitespace-nowrap"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Reschedule Dialog */}
      {selectedGame && (
        <RescheduleDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          gameId={selectedGame.id}
          currentScheduledAt={selectedGame.originalScheduledAt}
          currentVenue={
            selectedGame.venueName
              ? { id: "venue-id", name: selectedGame.venueName }
              : undefined
          }
          onSuccess={handleRescheduleSuccess}
          tenantSlug={leagueSlug || "pilot"}
        />
      )}
    </div>
  );
}
