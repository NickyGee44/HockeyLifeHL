"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllSuspensions, createSuspension, updateSuspension, deleteSuspension } from "@/lib/admin/suspension-actions";
import { getAvailableCaptains } from "@/lib/teams/actions";
import { toast } from "sonner";
import { useActiveLeague } from "@/hooks/use-league";

export default function AdminSuspensionsPage() {
  const { leagueId, isLoading: leagueLoading, branding } = useActiveLeague();
  const [suspensions, setSuspensions] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    playerId: "",
    reason: "",
    gamesRemaining: "1",
    startDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (leagueId) {
      loadData();
    }
  }, [leagueId]);

  async function loadData() {
    if (!leagueId) return;
    setLoading(true);
    const [suspensionsResult, playersResult] = await Promise.all([
      getAllSuspensions(),
      getAvailableCaptains(),
    ]);
    
    if (suspensionsResult.suspensions) {
      setSuspensions(suspensionsResult.suspensions);
    }
    if (playersResult.players) {
      setPlayers(playersResult.players);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!leagueId) return;
    const form = new FormData();
    form.set("playerId", formData.playerId);
    form.set("reason", formData.reason);
    form.set("gamesRemaining", formData.gamesRemaining);
    form.set("startDate", formData.startDate);
    form.set("league_id", leagueId);

    const result = await createSuspension(form);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Suspension created");
      setIsCreateOpen(false);
      setFormData({ playerId: "", reason: "", gamesRemaining: "1", startDate: new Date().toISOString().split("T")[0] });
      loadData();
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono text-[10px]">ADMIN</Badge>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground text-sm font-medium">{branding?.name || "League"}</span>
          </div>
          <h1 className="text-3xl font-bold">Suspensions 🚫</h1>
          <p className="text-muted-foreground mt-2">
            Manage player suspensions for this league
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-canada-red hover:bg-canada-red-dark">
              + New Suspension
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Suspension</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Player</Label>
                <Select value={formData.playerId} onValueChange={(v) => setFormData({ ...formData, playerId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Games Remaining</Label>
                <Input type="number" min="1" value={formData.gamesRemaining} onChange={(e) => setFormData({ ...formData, gamesRemaining: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-canada-red hover:bg-canada-red-dark">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Suspensions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {suspensions.filter(s => s.games_remaining > 0).map(suspension => (
              <div key={suspension.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{suspension.player?.full_name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">{suspension.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {suspension.games_remaining} games remaining
                  </p>
                </div>
                <Badge variant="destructive">Suspended</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
