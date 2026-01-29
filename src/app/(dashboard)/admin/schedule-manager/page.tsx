"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScheduleFilterBar } from "@/components/schedule/ScheduleFilterBar";
import { DayTabs } from "@/components/schedule/DayTabs";
import { GameRow } from "@/components/schedule/GameRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useActiveLeague } from "@/hooks/use-league";
import { addDays, startOfDay, endOfDay, format, parseISO } from "date-fns";

/**
 * Admin Schedule Manager Page
 *
 * Comprehensive schedule management interface for league admins.
 * Features:
 * - Filter by division, team, venue, date range
 * - Day-by-day navigation
 * - Reschedule/cancel games with conflict detection
 * - Bulk reschedule wizard for weather cancellations
 * - Postponed games queue
 *
 * Uses BMHL Phase 1A APIs:
 * - GET /api/[tenant]/schedule
 * - POST /api/[tenant]/games/[gameId]/reschedule
 * - POST /api/[tenant]/games/[gameId]/cancel
 * - POST /api/[tenant]/games/bulk-reschedule
 */

type Game = {
  id: string;
  scheduledAt: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  homeTeam: {
    id: string;
    name: string;
    logoUrl?: string;
    score?: number;
  };
  awayTeam: {
    id: string;
    name: string;
    logoUrl?: string;
    score?: number;
  };
  venue?: {
    id: string;
    name: string;
  };
  division?: {
    id: string;
    name: string;
  };
  hasConflicts?: boolean;
};

type FilterOption = {
  id: string;
  name: string;
};

export default function AdminScheduleManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { leagueSlug } = useActiveLeague();

  // State
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedDivision, setSelectedDivision] = useState<string | undefined>();
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();
  const [selectedVenue, setSelectedVenue] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filter options (will be fetched from API in production)
  const [divisions, setDivisions] = useState<FilterOption[]>([]);
  const [teams, setTeams] = useState<FilterOption[]>([]);
  const [venues, setVenues] = useState<FilterOption[]>([]);

  // Date range for day tabs (show 2 weeks)
  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 7));

  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
  });

  // Count active filters
  const activeFilterCount = [
    selectedDivision,
    selectedTeam,
    selectedVenue,
  ].filter(Boolean).length;

  /**
   * Fetch games from Schedule Query API
   */
  const fetchGames = async () => {
    if (!leagueSlug) return; // Wait for league context to load

    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedDivision) params.append("division_id", selectedDivision);
      if (selectedTeam) params.append("team_id", selectedTeam);
      if (selectedVenue) params.append("venue_id", selectedVenue);

      // Date range (selected day start to end)
      params.append("start_date", startOfDay(selectedDate).toISOString());
      params.append("end_date", endOfDay(selectedDate).toISOString());

      params.append("limit", pagination.limit.toString());
      params.append("offset", pagination.offset.toString());

      const response = await fetch(`/api/${leagueSlug}/schedule?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch games: ${response.statusText}`);
      }

      const data = await response.json();
      setGames(data.games || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Error fetching games:", err);
      setError(err instanceof Error ? err.message : "Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch filter options (divisions, teams, venues)
   * TODO: Create dedicated API endpoints for these
   */
  const fetchFilterOptions = async () => {
    // Mock data for now
    setDivisions([
      { id: "div-1", name: "Division A" },
      { id: "div-2", name: "Division B" },
    ]);
    setTeams([
      { id: "team-1", name: "Team Red" },
      { id: "team-2", name: "Team Blue" },
      { id: "team-3", name: "Team Green" },
    ]);
    setVenues([
      { id: "venue-1", name: "Arena 1" },
      { id: "venue-2", name: "Arena 2" },
    ]);
  };

  /**
   * Initialize: Fetch filter options and games
   */
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchGames();
  }, [selectedDivision, selectedTeam, selectedVenue, selectedDate, pagination.offset]);

  /**
   * Handle filter changes
   */
  const handleDivisionChange = (divisionId: string | undefined) => {
    setSelectedDivision(divisionId);
    setPagination({ ...pagination, offset: 0 }); // Reset pagination
  };

  const handleTeamChange = (teamId: string | undefined) => {
    setSelectedTeam(teamId);
    setPagination({ ...pagination, offset: 0 });
  };

  const handleVenueChange = (venueId: string | undefined) => {
    setSelectedVenue(venueId);
    setPagination({ ...pagination, offset: 0 });
  };

  const handleClearFilters = () => {
    setSelectedDivision(undefined);
    setSelectedTeam(undefined);
    setSelectedVenue(undefined);
    setPagination({ ...pagination, offset: 0 });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setPagination({ ...pagination, offset: 0 });
  };

  /**
   * Filter games by status for tabs
   */
  const scheduledGames = games.filter((g) => g.status === "scheduled");
  const postponedGames = games.filter((g) => g.status === "postponed");
  const completedGames = games.filter((g) => g.status === "completed");
  const cancelledGames = games.filter((g) => g.status === "cancelled");

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage game schedules, reschedule conflicts, and handle cancellations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/schedule-manager/postponed-queue")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Postponed Queue ({postponedGames.length})
          </Button>
          <Button
            variant="default"
            onClick={() => router.push("/admin/schedule-manager/bulk-reschedule")}
          >
            Bulk Reschedule
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ScheduleFilterBar
        selectedDivision={selectedDivision}
        selectedTeam={selectedTeam}
        selectedVenue={selectedVenue}
        divisions={divisions}
        teams={teams}
        venues={venues}
        onDivisionChange={handleDivisionChange}
        onTeamChange={handleTeamChange}
        onVenueChange={handleVenueChange}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Day Tabs */}
      <DayTabs
        dates={dates}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        showTodayLabel={true}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading games...</p>
          </CardContent>
        </Card>
      )}

      {/* Games List */}
      {!loading && !error && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scheduledGames.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Postponed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {postponedGames.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {completedGames.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {cancelledGames.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Games for Selected Day */}
          <Card>
            <CardHeader>
              <CardTitle>
                Games for {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {games.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No games scheduled for this day
                </div>
              ) : (
                games.map((game) => (
                  <GameRow
                    key={game.id}
                    gameId={game.id}
                    homeTeam={{
                      id: game.homeTeam.id,
                      name: game.homeTeam.name,
                      logoUrl: game.homeTeam.logoUrl,
                      score: game.homeTeam.score,
                    }}
                    awayTeam={{
                      id: game.awayTeam.id,
                      name: game.awayTeam.name,
                      logoUrl: game.awayTeam.logoUrl,
                      score: game.awayTeam.score,
                    }}
                    scheduledAt={parseISO(game.scheduledAt)}
                    status={game.status}
                    venue={game.venue}
                    division={game.division}
                    tenantSlug="pilot"
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.offset + 1} to{" "}
                {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
                {pagination.total} games
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setPagination({
                      ...pagination,
                      offset: Math.max(0, pagination.offset - pagination.limit),
                    })
                  }
                  disabled={pagination.offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPagination({
                      ...pagination,
                      offset: pagination.offset + pagination.limit,
                    })
                  }
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
