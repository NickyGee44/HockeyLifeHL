"use client";

import { currentLeague } from "@/lib/league-config";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HockeyLoader } from "@/components/ui/hockey-loader";
import { toast } from "sonner";
import { movePlayerToTeam, executeTrade, revertTrade, getTradeHistory } from "@/lib/admin/trade-actions";
import { motion } from "framer-motion";
import { useActiveLeague } from "@/hooks/use-league";

export default function TradesPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const { leagueId, isLoading: leagueLoading } = useActiveLeague();
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: () => void; message: string }>({
    open: false,
    action: () => {},
    message: "",
  });

  // Quick Move State
  const [quickMovePlayer, setQuickMovePlayer] = useState<string>("");
  const [quickMoveToTeam, setQuickMoveToTeam] = useState<string>("");
  const [quickMoveNotes, setQuickMoveNotes] = useState<string>("");
  const [quickMoving, setQuickMoving] = useState(false);

  // Player Swap State
  const [teamAId, setTeamAId] = useState<string>("");
  const [teamAPlayerId, setTeamAPlayerId] = useState<string>("");
  const [teamBId, setTeamBId] = useState<string>("");
  const [teamBPlayerId, setTeamBPlayerId] = useState<string>("");
  const [swapNotes, setSwapNotes] = useState<string>("");
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    if (authLoading || leagueLoading) return;
    if (!user || !isOwner || !leagueId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user, isOwner, authLoading, leagueId, leagueLoading]);

  async function loadData() {
    if (!leagueId) return;
    const supabase = createClient();

    const [seasonsResult, teamsResult, tradesResult] = await Promise.all([
      supabase.from("seasons")
        .select("*")
        .eq("league_id", leagueId)
        .order("start_date", { ascending: false }),
      supabase.from("teams")
        .select("*")
        .eq("league_id", leagueId)
        .order("name"),
      getTradeHistory(leagueId),
    ]);

    setSeasons(seasonsResult.data || []);
    setTeams(teamsResult.data || []);
    setTrades(tradesResult.trades || []);

    // Set first active season as default
    const activeSeason = seasonsResult.data?.find((s: any) => s.status === "active");
    if (activeSeason) {
      setSelectedSeason(activeSeason.id);
      await loadPlayersForSeason(activeSeason.id);
    }

    setLoading(false);
  }

  async function loadPlayersForSeason(seasonId: string) {
    const supabase = createClient();

    const { data } = await supabase
      .from("team_rosters")
      .select(`
        player_id,
        team_id,
        player:profiles!player_id(id, full_name, avatar_url),
        team:teams!team_id(id, name)
      `)
      .eq("season_id", seasonId);

    setPlayers(data || []);
  }

  useEffect(() => {
    if (selectedSeason) {
      loadPlayersForSeason(selectedSeason);
    }
  }, [selectedSeason]);

  const handleQuickMove = async () => {
    if (!quickMovePlayer || !quickMoveToTeam || !selectedSeason) {
      toast.error("Please select a player and target team");
      return;
    }

    const playerRoster = players.find((p: any) => p.player_id === quickMovePlayer);
    if (!playerRoster) {
      toast.error("Player not found");
      return;
    }

    const fromTeam = teams.find((t) => t.id === playerRoster.team_id);
    const toTeam = teams.find((t) => t.id === quickMoveToTeam);

    setConfirmDialog({
      open: true,
      message: `Move ${playerRoster.player.full_name} from ${fromTeam?.name} to ${toTeam?.name}?`,
      action: async () => {
        setQuickMoving(true);
        const result = await movePlayerToTeam(
          quickMovePlayer,
          playerRoster.team_id,
          quickMoveToTeam,
          selectedSeason,
          quickMoveNotes
        );
        setQuickMoving(false);

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Player moved successfully!");
          setQuickMovePlayer("");
          setQuickMoveToTeam("");
          setQuickMoveNotes("");
          loadData();
        }
        setConfirmDialog({ open: false, action: () => {}, message: "" });
      },
    });
  };

  const handlePlayerSwap = async () => {
    if (!teamAPlayerId || !teamBPlayerId || !selectedSeason) {
      toast.error("Please select both players");
      return;
    }

    if (teamAPlayerId === teamBPlayerId) {
      toast.error("Cannot swap a player with themselves");
      return;
    }

    const playerA = players.find((p: any) => p.player_id === teamAPlayerId);
    const playerB = players.find((p: any) => p.player_id === teamBPlayerId);

    if (!playerA || !playerB) {
      toast.error("Players not found");
      return;
    }

    setConfirmDialog({
      open: true,
      message: `Swap ${playerA.player.full_name} (${playerA.team.name}) with ${playerB.player.full_name} (${playerB.team.name})?`,
      action: async () => {
        setSwapping(true);
        const result = await executeTrade(
          teamAPlayerId,
          playerA.team_id,
          teamBPlayerId,
          playerB.team_id,
          selectedSeason,
          swapNotes
        );
        setSwapping(false);

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Trade executed successfully!");
          setTeamAId("");
          setTeamAPlayerId("");
          setTeamBId("");
          setTeamBPlayerId("");
          setSwapNotes("");
          loadData();
        }
        setConfirmDialog({ open: false, action: () => {}, message: "" });
      },
    });
  };

  const handleRevertTrade = async (tradeId: string) => {
    setConfirmDialog({
      open: true,
      message: "Are you sure you want to revert this trade? All player movements will be undone.",
      action: async () => {
        const result = await revertTrade(tradeId);

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Trade reverted successfully!");
          loadData();
        }
        setConfirmDialog({ open: false, action: () => {}, message: "" });
      },
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <HockeyLoader size="lg" text="Loading trades..." />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Only league owners can access this page.</p>
      </div>
    );
  }

  const teamAPlayers = players.filter((p: any) => p.team_id === teamAId);
  const teamBPlayers = players.filter((p: any) => p.team_id === teamBId);
  const selectedPlayer = players.find((p: any) => p.player_id === quickMovePlayer);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono text-[10px]">ADMIN</Badge>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground text-sm font-medium">{currentLeague.name}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            Trade <span className="text-canada-red">Management</span>
          </h1>
          <p className="text-muted-foreground mt-1">Manually reassign players between teams for this league</p>
        </div>

        <Select value={selectedSeason} onValueChange={setSelectedSeason}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((season) => (
              <SelectItem key={season.id} value={season.id}>
                {season.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Move */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Player Move</CardTitle>
            <CardDescription>Move a single player to a different team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Player</Label>
              <Select value={quickMovePlayer} onValueChange={setQuickMovePlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((roster: any) => (
                    <SelectItem key={roster.player_id} value={roster.player_id}>
                      {roster.player.full_name} ({roster.team.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlayer && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Team:</p>
                <p className="font-semibold">{selectedPlayer.team.name}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Target Team</Label>
              <Select value={quickMoveToTeam} onValueChange={setQuickMoveToTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams
                    .filter((t) => !selectedPlayer || t.id !== selectedPlayer.team_id)
                    .map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Reason for trade..."
                value={quickMoveNotes}
                onChange={(e) => setQuickMoveNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleQuickMove}
              disabled={quickMoving || !quickMovePlayer || !quickMoveToTeam}
            >
              {quickMoving ? "Moving..." : "Move Player"}
            </Button>
          </CardContent>
        </Card>

        {/* Player Swap */}
        <Card>
          <CardHeader>
            <CardTitle>Player Swap Trade</CardTitle>
            <CardDescription>Exchange players between two teams</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Team A</Label>
              <Select value={teamAId} onValueChange={setTeamAId}>
                <SelectTrigger>
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

            {teamAId && (
              <div className="space-y-2">
                <Label>Team A Player</Label>
                <Select value={teamAPlayerId} onValueChange={setTeamAPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamAPlayers.map((roster: any) => (
                      <SelectItem key={roster.player_id} value={roster.player_id}>
                        {roster.player.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-center py-2">
              <div className="text-2xl">↔️</div>
            </div>

            <div className="space-y-2">
              <Label>Team B</Label>
              <Select value={teamBId} onValueChange={setTeamBId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.filter((t) => t.id !== teamAId).map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {teamBId && (
              <div className="space-y-2">
                <Label>Team B Player</Label>
                <Select value={teamBPlayerId} onValueChange={setTeamBPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamBPlayers.map((roster: any) => (
                      <SelectItem key={roster.player_id} value={roster.player_id}>
                        {roster.player.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Reason for swap..."
                value={swapNotes}
                onChange={(e) => setSwapNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              className="w-full"
              onClick={handlePlayerSwap}
              disabled={swapping || !teamAPlayerId || !teamBPlayerId}
            >
              {swapping ? "Executing..." : "Execute Trade"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>View and manage past trades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Executed By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No trades executed yet
                    </TableCell>
                  </TableRow>
                ) : (
                  trades.map((trade: any) => {
                    const canRevert = !trade.reverted_at &&
                      (new Date().getTime() - new Date(trade.executed_at).getTime()) < 24 * 60 * 60 * 1000;

                    return (
                      <TableRow key={trade.id}>
                        <TableCell className="text-sm">
                          {new Date(trade.executed_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {trade.trade_type === "manual" ? "Move" : "Swap"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {trade.trade_players.map((tp: any, i: number) => (
                            <div key={tp.id}>
                              {tp.player.full_name}
                              {i < trade.trade_players.length - 1 && " ↔️ "}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-sm">
                          {trade.trade_players.map((tp: any, i: number) => (
                            <div key={tp.id}>
                              {tp.from_team.name} → {tp.to_team.name}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-sm">
                          {trade.executed_by_profile.full_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {trade.notes || "-"}
                        </TableCell>
                        <TableCell>
                          {trade.reverted_at ? (
                            <Badge variant="destructive">Reverted</Badge>
                          ) : (
                            <Badge className="bg-success">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {canRevert && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevertTrade(trade.id)}
                            >
                              Revert
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Trade</DialogTitle>
            <DialogDescription>{confirmDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={confirmDialog.action}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
