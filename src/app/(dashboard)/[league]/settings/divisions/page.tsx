"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  getAllDivisions,
  createDivision,
  updateDivision,
  deleteDivision
} from "@/lib/divisions/actions";
import type { Database } from "@/types/database";
import { Plus, Pencil, Trash2, Info } from "lucide-react";

type Division = Database['public']['Tables']['divisions']['Row'];

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' },
];

const PERIOD_COUNTS = [
  { value: '1', label: '1 Period' },
  { value: '2', label: '2 Periods' },
  { value: '3', label: '3 Periods' },
];

export default function DivisionsSettingsPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [deletingDivisionId, setDeletingDivisionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    skillLevel: "",
    maxTeams: "8",
    gameDuration: "60",
    periodCount: "3",
  });

  useEffect(() => {
    loadDivisions();
  }, []);

  async function loadDivisions() {
    setLoading(true);
    const result = await getAllDivisions();

    if (result.error) {
      toast.error(result.error);
    } else {
      setDivisions(result.divisions);
    }

    setLoading(false);
  }

  function resetForm() {
    setFormData({
      name: "",
      skillLevel: "",
      maxTeams: "8",
      gameDuration: "60",
      periodCount: "3",
    });
  }

  function openEditDialog(division: Division) {
    setEditingDivision(division);
    setFormData({
      name: division.name,
      skillLevel: division.skill_level || "",
      maxTeams: division.max_teams?.toString() || "8",
      gameDuration: division.game_duration_minutes?.toString() || "60",
      periodCount: division.period_count?.toString() || "3",
    });
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      toast.error("Please enter a division name");
      return;
    }

    setIsSaving(true);
    const form = new FormData();
    form.set("name", formData.name);
    form.set("skillLevel", formData.skillLevel);
    form.set("maxTeams", formData.maxTeams);
    form.set("gameDuration", formData.gameDuration);
    form.set("periodCount", formData.periodCount);

    const result = await createDivision(form);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Division created successfully!");
      setIsCreateOpen(false);
      resetForm();
      loadDivisions();
    }
    setIsSaving(false);
  }

  async function handleUpdate() {
    if (!editingDivision) return;

    if (!formData.name.trim()) {
      toast.error("Please enter a division name");
      return;
    }

    setIsSaving(true);
    const form = new FormData();
    form.set("name", formData.name);
    form.set("skillLevel", formData.skillLevel);
    form.set("maxTeams", formData.maxTeams);
    form.set("gameDuration", formData.gameDuration);
    form.set("periodCount", formData.periodCount);

    const result = await updateDivision(editingDivision.id, form);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Division updated successfully!");
      setEditingDivision(null);
      resetForm();
      loadDivisions();
    }
    setIsSaving(false);
  }

  async function handleDelete(divisionId: string) {
    const result = await deleteDivision(divisionId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Division deleted successfully!");
      setDeletingDivisionId(null);
      loadDivisions();
    }
  }

  const getSkillLevelBadgeColor = (skillLevel: string | null) => {
    switch (skillLevel) {
      case 'beginner':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'advanced':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'elite':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
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
        <h1 className="text-3xl font-bold tracking-tight">Division Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage divisions for organizing teams by skill level and game format.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <CardDescription className="text-sm text-blue-900">
              Divisions help organize teams by skill level and define game parameters like duration and period count.
              Teams can be assigned to divisions when creating seasons.
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      {/* Create Button */}
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Division
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Division</DialogTitle>
              <DialogDescription>
                Add a new division to organize teams by skill level.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Division Name *</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., A Division, Recreational"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-skill">Skill Level</Label>
                <Select
                  value={formData.skillLevel}
                  onValueChange={(value) => setFormData({ ...formData, skillLevel: value })}
                >
                  <SelectTrigger id="create-skill">
                    <SelectValue placeholder="Select skill level (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-max-teams">Max Teams *</Label>
                  <Input
                    id="create-max-teams"
                    type="number"
                    min="2"
                    max="20"
                    value={formData.maxTeams}
                    onChange={(e) => setFormData({ ...formData, maxTeams: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">2-20 teams</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-period-count">Periods *</Label>
                  <Select
                    value={formData.periodCount}
                    onValueChange={(value) => setFormData({ ...formData, periodCount: value })}
                  >
                    <SelectTrigger id="create-period-count">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_COUNTS.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-duration">Game Duration (minutes) *</Label>
                <Input
                  id="create-duration"
                  type="number"
                  min="30"
                  max="90"
                  value={formData.gameDuration}
                  onChange={(e) => setFormData({ ...formData, gameDuration: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">30-90 minutes</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Division"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Divisions Table */}
      {divisions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No divisions yet. Create your first division!</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Division
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Divisions ({divisions.length})</CardTitle>
            <CardDescription>
              All divisions configured for this league
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Skill Level</TableHead>
                    <TableHead className="text-center">Max Teams</TableHead>
                    <TableHead className="text-center">Game Duration</TableHead>
                    <TableHead className="text-center">Periods</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divisions.map((division) => (
                    <TableRow key={division.id}>
                      <TableCell className="font-medium">{division.name}</TableCell>
                      <TableCell>
                        {division.skill_level ? (
                          <Badge variant="secondary" className={getSkillLevelBadgeColor(division.skill_level)}>
                            {SKILL_LEVELS.find(l => l.value === division.skill_level)?.label || division.skill_level}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{division.max_teams || '-'}</TableCell>
                      <TableCell className="text-center">
                        {division.game_duration_minutes ? `${division.game_duration_minutes} min` : '-'}
                      </TableCell>
                      <TableCell className="text-center">{division.period_count || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(division)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingDivisionId(division.id)}
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
      <Dialog open={!!editingDivision} onOpenChange={(open) => {
        if (!open) {
          setEditingDivision(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Division</DialogTitle>
            <DialogDescription>
              Update division information and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Division Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., A Division, Recreational"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-skill">Skill Level</Label>
              <Select
                value={formData.skillLevel}
                onValueChange={(value) => setFormData({ ...formData, skillLevel: value })}
              >
                <SelectTrigger id="edit-skill">
                  <SelectValue placeholder="Select skill level (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max-teams">Max Teams *</Label>
                <Input
                  id="edit-max-teams"
                  type="number"
                  min="2"
                  max="20"
                  value={formData.maxTeams}
                  onChange={(e) => setFormData({ ...formData, maxTeams: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">2-20 teams</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-period-count">Periods *</Label>
                <Select
                  value={formData.periodCount}
                  onValueChange={(value) => setFormData({ ...formData, periodCount: value })}
                >
                  <SelectTrigger id="edit-period-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_COUNTS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Game Duration (minutes) *</Label>
              <Input
                id="edit-duration"
                type="number"
                min="30"
                max="90"
                value={formData.gameDuration}
                onChange={(e) => setFormData({ ...formData, gameDuration: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">30-90 minutes</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingDivision(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDivisionId} onOpenChange={(open) => !open && setDeletingDivisionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Division?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this division? This action cannot be undone.
              Teams currently assigned to this division will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDivisionId && handleDelete(deletingDivisionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Division
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
