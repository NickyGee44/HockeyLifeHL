"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  getAllGames, 
  createGame, 
  updateGame, 
  deleteGame,
  cancelGame,
  rescheduleGame
} from "@/lib/games/actions";
import { getAllSeasons } from "@/lib/seasons/actions";
import { getAllTeams } from "@/lib/teams/actions";
import { toast } from "sonner";
import type { Game, GameStatus, Season, Team } from "@/types/database";

type GameWithRelations = Game & {
  season: Season | null;
  home_team: Team | null;
  away_team: Team | null;
};

export default function AdminGamesPage() {
  const [games, setGames] = useState<GameWithRelations[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithRelations | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [cancelGameId, setCancelGameId] = useState<string | null>(null);
  const [rescheduleGameId, setRescheduleGameId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    seasonId: "",
    homeTeamId: "",
    awayTeamId: "",
    scheduledAt: "",
    location: "",
    homeScore: "0",
    awayScore: "0",
    status: "scheduled" as GameStatus,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [gamesResult, seasonsResult, teamsResult] = await Promise.all([
      getAllGames(),
      getAllSeasons(),
      getAllTeams(),
    ]);
    
    if (gamesResult.error) {
      toast.error(gamesResult.error);
    } else {
      setGames(gamesResult.games as GameWithRelations[]);
    }
    
    if (seasonsResult.seasons) {
      setSeasons(seasonsResult.seasons);
    }
    
    if (teamsResult.teams) {
      setTeams(teamsResult.teams as Team[]);
    }
    
    setLoading(false);
  }

  function resetForm() {
    setFormData({
      seasonId: seasons.find(s => s.status === "active")?.id || "",
      homeTeamId: "",
      awayTeamId: "",
      scheduledAt: "",
      location: "",
      homeScore: "0",
      awayScore: "0",
      status: "scheduled" as GameStatus,
    });
  }

  function openEditDialog(game: GameWithRelations) {
    setEditingGame(game);
    setFormData({
      seasonId: game.season_id,
      homeTeamId: game.home_team_id,
      awayTeamId: game.away_team_id,
      scheduledAt: game.scheduled_at ? new Date(game.scheduled_at).toISOString().slice(0, 16) : "",
      location: game.location || "",
      homeScore: game.home_score.toString(),
      awayScore: game.away_score.toString(),
      status: game.status,
    });
  }

  async function handleCreate() {
    setIsSaving(true);
    const form = new FormData();
    form.set("seasonId", formData.seasonId);
    form.set("homeTeamId", formData.homeTeamId);
    form.set("awayTeamId", formData.awayTeamId);
    form.set("scheduledAt", new Date(formData.scheduledAt).toISOString());
    if (formData.location) form.set("location", formData.location);

    const result = await createGame(form);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Game created successfully!");
      setIsCreateOpen(false);
      resetForm();
      loadData();
    }
    setIsSaving(false);
  }

  async function handleUpdate() {
    if (!editingGame) return;
    
    setIsSaving(true);
    const form = new FormData();
    form.set("seasonId", formData.seasonId);
    form.set("homeTeamId", formData.homeTeamId);
    form.set("awayTeamId", formData.awayTeamId);
    form.set("scheduledAt", new Date(formData.scheduledAt).toISOString());
    if (formData.location) form.set("location", formData.location);
    form.set("homeScore", formData.homeScore);
    form.set("awayScore", formData.awayScore);
    form.set("status", formData.status);

    const result = await updateGame(editingGame.id, form);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Game updated successfully!");
      setEditingGame(null);
      resetForm();
      loadData();
    }
    setIsSaving(false);
  }

  async function handleDelete(gameId: string) {
    const result = await deleteGame(gameId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Game deleted successfully!");
      setDeleteConfirm(null);
      loadData();
    }
  }

  const getStatusBadge = (status: GameStatus) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline">📅 Scheduled</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-600">⏱️ In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-600">✓ Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">❌ Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter games
  const filteredGames = games.filter((game) => {
    const matchesSeason = seasonFilter === "all" || game.season_id === seasonFilter;
    const matchesStatus = statusFilter === "all" || game.status === statusFilter;
    return matchesSeason && matchesStatus;
  });

  // Initialize form with active season
  useEffect(() => {
    if (seasons.length > 0 && !formData.seasonId) {
      const activeSeason = seasons.find(s => s.status === "active" || s.status === "playoffs");
      if (activeSeason) {
        setFormData(prev => ({ ...prev, seasonId: activeSeason.id }));
      }
    }
  }, [seasons]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Games 🎮</h1>
          <p className="text-muted-foreground mt-2">
            Schedule and manage league games
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-canada-red hover:bg-canada-red-dark">
              + New Game
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
              <DialogDescription>
                Schedule a new game between two teams
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-season">Season</Label>
                <Select
                  value={formData.seasonId}
                  onValueChange={(value) => setFormData({ ...formData, seasonId: value })}
                >
                  <SelectTrigger id="create-season">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.name} {season.status === "active" && "🏒"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-home">Home Team</Label>
                  <Select
                    value={formData.homeTeamId}
                    onValueChange={(value) => setFormData({ ...formData, homeTeamId: value })}
                  >
                    <SelectTrigger id="create-home">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-away">Away Team</Label>
                  <Select
                    value={formData.awayTeamId}
                    onValueChange={(value) => setFormData({ ...formData, awayTeamId: value })}
                  >
                    <SelectTrigger id="create-away">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.filter(t => t.id !== formData.homeTeamId).map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-datetime">Date & Time</Label>
                <Input
                  id="create-datetime"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-location">Location (Optional)</Label>
                <Input
                  id="create-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Arena name or address"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={isSaving}
                className="bg-canada-red hover:bg-canada-red-dark"
              >
                {isSaving ? "Creating..." : "Create Game"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map((season) => (
              <SelectItem key={season.id} value={season.id}>
                {season.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Games Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Games</CardTitle>
          <CardDescription>
            {filteredGames.length} game{filteredGames.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGames.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No games found. Create your first game!
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Home Team</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Away Team</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        {new Date(game.scheduled_at).toLocaleString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        {game.home_team ? (
                          <Link 
                            href={`/teams/${game.home_team.id}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: game.home_team.primary_color }}
                            />
                            <span className="font-medium">{game.home_team.name}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">TBD</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {game.status === "completed" ? (
                          <span>
                            {game.home_score} - {game.away_score}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {game.away_team ? (
                          <Link 
                            href={`/teams/${game.away_team.id}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: game.away_team.primary_color }}
                            />
                            <span className="font-medium">{game.away_team.name}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">TBD</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {game.location || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(game.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {game.season?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(game)}
                          >
                            Edit
                          </Button>
                          {game.status !== "cancelled" && (
                            <Dialog open={cancelGameId === game.id} onOpenChange={(open) => {
                              setCancelGameId(open ? game.id : null);
                              if (!open) setCancelReason("");
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
                                  Cancel
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Cancel Game</DialogTitle>
                                  <DialogDescription>
                                    Cancel this game? You can reschedule it later.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="cancel-reason">Cancellation Reason</Label>
                                    <Input
                                      id="cancel-reason"
                                      value={cancelReason}
                                      onChange={(e) => setCancelReason(e.target.value)}
                                      placeholder="e.g., Weather, Arena issue, etc."
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => {
                                    setCancelGameId(null);
                                    setCancelReason("");
                                  }}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    onClick={handleCancelGame}
                                    disabled={isSaving || !cancelReason.trim()}
                                  >
                                    {isSaving ? "Cancelling..." : "Cancel Game"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                          {game.status === "cancelled" && (
                            <Dialog open={rescheduleGameId === game.id} onOpenChange={(open) => {
                              setRescheduleGameId(open ? game.id : null);
                              if (!open) setNewScheduledAt("");
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700">
                                  Reschedule
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reschedule Game</DialogTitle>
                                  <DialogDescription>
                                    Set a new date and time for this cancelled game.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="new-scheduled-at">New Date & Time</Label>
                                    <Input
                                      id="new-scheduled-at"
                                      type="datetime-local"
                                      value={newScheduledAt}
                                      onChange={(e) => setNewScheduledAt(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => {
                                    setRescheduleGameId(null);
                                    setNewScheduledAt("");
                                  }}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleRescheduleGame}
                                    disabled={isSaving || !newScheduledAt}
                                  >
                                    {isSaving ? "Rescheduling..." : "Reschedule Game"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Dialog open={deleteConfirm === game.id} onOpenChange={(open) => setDeleteConfirm(open ? game.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Game?</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this game? 
                                  Games with stats cannot be deleted.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={() => handleDelete(game.id)}>
                                  Delete Game
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingGame} onOpenChange={() => { setEditingGame(null); resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
            <DialogDescription>
              Update game information and scores
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-season">Season</Label>
              <Select
                value={formData.seasonId}
                onValueChange={(value) => setFormData({ ...formData, seasonId: value })}
              >
                <SelectTrigger id="edit-season">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-home">Home Team</Label>
                <Select
                  value={formData.homeTeamId}
                  onValueChange={(value) => setFormData({ ...formData, homeTeamId: value })}
                >
                  <SelectTrigger id="edit-home">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-away">Away Team</Label>
                <Select
                  value={formData.awayTeamId}
                  onValueChange={(value) => setFormData({ ...formData, awayTeamId: value })}
                >
                  <SelectTrigger id="edit-away">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.filter(t => t.id !== formData.homeTeamId).map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-datetime">Date & Time</Label>
              <Input
                id="edit-datetime"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-home-score">Home Score</Label>
                <Input
                  id="edit-home-score"
                  type="number"
                  min="0"
                  value={formData.homeScore}
                  onChange={(e) => setFormData({ ...formData, homeScore: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-away-score">Away Score</Label>
                <Input
                  id="edit-away-score"
                  type="number"
                  min="0"
                  value={formData.awayScore}
                  onChange={(e) => setFormData({ ...formData, awayScore: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as GameStatus })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                  <SelectItem value="in_progress">⏱️ In Progress</SelectItem>
                  <SelectItem value="completed">✓ Completed</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingGame(null); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={isSaving}
              className="bg-canada-red hover:bg-canada-red-dark"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
