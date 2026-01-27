"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  getAllScorekeepers,
  addScorekeeper,
  updateScorekeeper,
  removeScorekeeperFromLeague,
} from "@/lib/scorekeepers/actions";
import { Plus, Pencil, Trash2, Info, DollarSign, Users, Receipt } from "lucide-react";

type Scorekeeper = any; // Will be typed from database

export default function ScorekeepersSettingsPage() {
  const router = useRouter();
  const [scorekeepers, setScorekeepers] = useState<Scorekeeper[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScorekeeper, setEditingScorekeeper] = useState<Scorekeeper | null>(null);
  const [removingScorekeeperId, setRemovingScorekeeperId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    hourlyRate: "30",
    canEditGames: false,
    canVerifyGames: false,
    notes: "",
  });

  useEffect(() => {
    loadScorekeepers();
  }, []);

  async function loadScorekeepers() {
    setLoading(true);
    const result = await getAllScorekeepers();

    if (result.error) {
      toast.error(result.error);
    } else {
      setScorekeepers(result.scorekeepers);
    }

    setLoading(false);
  }

  function resetForm() {
    setFormData({
      email: "",
      hourlyRate: "30",
      canEditGames: false,
      canVerifyGames: false,
      notes: "",
    });
  }

  function openEditDialog(scorekeeper: Scorekeeper) {
    setEditingScorekeeper(scorekeeper);
    setFormData({
      email: scorekeeper.profile?.email || "",
      hourlyRate: scorekeeper.hourly_rate?.toString() || "30",
      canEditGames: scorekeeper.can_edit_games || false,
      canVerifyGames: scorekeeper.can_verify_games || false,
      notes: scorekeeper.notes || "",
    });
  }

  async function handleCreate() {
    if (!formData.email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSaving(true);
    const form = new FormData();
    form.set("email", formData.email);
    form.set("hourlyRate", formData.hourlyRate);
    form.set("canEditGames", formData.canEditGames.toString());
    form.set("canVerifyGames", formData.canVerifyGames.toString());
    form.set("notes", formData.notes);

    const result = await addScorekeeper(form);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Scorekeeper added successfully!");
      setIsCreateOpen(false);
      resetForm();
      loadScorekeepers();
    }
    setIsSaving(false);
  }

  async function handleUpdate() {
    if (!editingScorekeeper) return;

    setIsSaving(true);
    const form = new FormData();
    form.set("hourlyRate", formData.hourlyRate);
    form.set("canEditGames", formData.canEditGames.toString());
    form.set("canVerifyGames", formData.canVerifyGames.toString());
    form.set("notes", formData.notes);

    const result = await updateScorekeeper(editingScorekeeper.id, form);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Scorekeeper updated successfully!");
      setEditingScorekeeper(null);
      resetForm();
      loadScorekeepers();
    }
    setIsSaving(false);
  }

  async function handleRemove(scorekeeperId: string) {
    const result = await removeScorekeeperFromLeague(scorekeeperId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Scorekeeper removed successfully!");
      setRemovingScorekeeperId(null);
      loadScorekeepers();
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scorekeeper Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage scorekeepers who enter stats and track their payments.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <CardDescription className="text-sm text-blue-900">
              Scorekeepers can enter game stats, verify scores, and help manage game data.
              Set hourly rates for payment tracking and assign permissions for editing capabilities.
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => router.push("scorekeepers/payments")}
        >
          <Receipt className="h-4 w-4 mr-2" />
          View Payments
        </Button>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Scorekeeper
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Scorekeeper</DialogTitle>
              <DialogDescription>
                Add an existing user as a scorekeeper for your league.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email Address *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="scorekeeper@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  User must already have an account
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-rate">Hourly Rate (USD) *</Label>
                <Input
                  id="create-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can-edit"
                      checked={formData.canEditGames}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, canEditGames: checked as boolean })
                      }
                    />
                    <label htmlFor="can-edit" className="text-sm font-normal">
                      Can edit game details
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can-verify"
                      checked={formData.canVerifyGames}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, canVerifyGames: checked as boolean })
                      }
                    />
                    <label htmlFor="can-verify" className="text-sm font-normal">
                      Can verify game scores
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-notes">Notes (Optional)</Label>
                <Textarea
                  id="create-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this scorekeeper..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? "Adding..." : "Add Scorekeeper"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scorekeepers Table */}
      {scorekeepers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No scorekeepers yet. Add your first scorekeeper!</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Scorekeeper
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scorekeepers ({scorekeepers.filter(sk => sk.status === 'active').length})</CardTitle>
            <CardDescription>
              All scorekeepers configured for this league
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scorekeeper</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-center">Assignments</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead className="text-right">Unpaid</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorekeepers.filter(sk => sk.status === 'active').map((scorekeeper) => (
                    <TableRow key={scorekeeper.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={scorekeeper.profile?.avatar_url} />
                            <AvatarFallback>
                              {scorekeeper.profile?.full_name?.substring(0, 2).toUpperCase() || "SK"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{scorekeeper.profile?.full_name || "Unknown"}</div>
                            <div className="text-sm text-muted-foreground">{scorekeeper.profile?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{scorekeeper.hourly_rate}/hr</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {scorekeeper.assignment_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(scorekeeper.total_earned || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {scorekeeper.total_unpaid > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {formatCurrency(scorekeeper.total_unpaid)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {scorekeeper.can_edit_games && (
                            <Badge variant="outline" className="text-xs">Edit</Badge>
                          )}
                          {scorekeeper.can_verify_games && (
                            <Badge variant="outline" className="text-xs">Verify</Badge>
                          )}
                          {!scorekeeper.can_edit_games && !scorekeeper.can_verify_games && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(scorekeeper)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemovingScorekeeperId(scorekeeper.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingScorekeeper} onOpenChange={(open) => {
        if (!open) {
          setEditingScorekeeper(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Scorekeeper</DialogTitle>
            <DialogDescription>
              Update scorekeeper settings and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-rate">Hourly Rate (USD) *</Label>
              <Input
                id="edit-rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-can-edit"
                    checked={formData.canEditGames}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canEditGames: checked as boolean })
                    }
                  />
                  <label htmlFor="edit-can-edit" className="text-sm font-normal">
                    Can edit game details
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-can-verify"
                    checked={formData.canVerifyGames}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canVerifyGames: checked as boolean })
                    }
                  />
                  <label htmlFor="edit-can-verify" className="text-sm font-normal">
                    Can verify game scores
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this scorekeeper..."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingScorekeeper(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removingScorekeeperId} onOpenChange={(open) => !open && setRemovingScorekeeperId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Scorekeeper?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this scorekeeper? They will no longer be able to enter stats for games.
              Any unpaid assignments should be settled before removing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingScorekeeperId && handleRemove(removingScorekeeperId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Scorekeeper
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
