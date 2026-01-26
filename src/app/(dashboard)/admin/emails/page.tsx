"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Mail, Send, Edit2, Eye, Sparkles, Users, UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { EmailType, EmailRecipient } from "@/lib/email/types";
import { useActiveLeague } from "@/hooks/use-league";

type EmailGenerationContext = {
  type: EmailType;
  recipientName?: string;
  recipientRole?: "player" | "captain" | "admin";
  gameDetails?: {
    date: string;
    time: string;
    opponent: string;
    location?: string;
  };
  seasonName?: string;
  teamName?: string;
  customContext?: string;
  tone?: "friendly" | "professional" | "casual" | "urgent";
};

export default function AdminEmailsPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const { leagueId, isLoading: leagueLoading, branding } = useActiveLeague();
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [emailType, setEmailType] = useState<EmailType>("custom");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [context, setContext] = useState<EmailGenerationContext>({
    type: "custom",
    tone: "friendly",
  });
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [showRecipientDialog, setShowRecipientDialog] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [availableGames, setAvailableGames] = useState<Array<{
    id: string;
    scheduled_at: string;
    home_team: { name: string } | null;
    away_team: { name: string } | null;
  }>>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [useAIGeneration, setUseAIGeneration] = useState(false);

  useEffect(() => {
    if (!authLoading && !isOwner) {
      toast.error("Admin access required");
    }
  }, [authLoading, isOwner]);

  useEffect(() => {
    if (isOwner && leagueId) {
      loadTeamsAndGames();
    }
  }, [isOwner, leagueId]);

  // Auto-populate template when email type changes
  useEffect(() => {
    if (emailType && isOwner && leagueId) {
      // Reset preview mode and load fresh template
      setPreviewMode(false);
      loadEmailTemplate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailType, isOwner, leagueId]);

  async function loadEmailTemplate() {
    if (!emailType || !leagueId) return;

    try {
      const response = await fetch("/api/email/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: emailType,
          leagueId,
          ...context,
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error("Error loading template:", data.error);
        toast.error("Failed to load template");
        return;
      }

      if (data.subject && data.html) {
        setSubject(data.subject);
        setHtml(data.html);
        setPreviewMode(true);
        toast.success("Template loaded! Edit as needed.");
      }
    } catch (error) {
      console.error("Error loading email template:", error);
      toast.error("Failed to load template");
    }
  }

  async function loadTeamsAndGames() {
    if (!leagueId) return;
    try {
      const [teamsRes, gamesRes] = await Promise.all([
        fetch(`/api/email/recipients?type=list-teams&leagueId=${leagueId}`),
        fetch(`/api/email/recipients?type=list-games&leagueId=${leagueId}`),
      ]);

      const teamsData = await teamsRes.json();
      const gamesData = await gamesRes.json();

      if (teamsData.teams) setAvailableTeams(teamsData.teams);
      if (gamesData.games) setAvailableGames(gamesData.games);
    } catch (error) {
      console.error("Error loading teams/games:", error);
    }
  }

  async function addRecipientGroup(type: string) {
    if (!leagueId) return;
    setLoadingRecipients(true);
    try {
      const response = await fetch(`/api/email/recipients?type=${type}&leagueId=${leagueId}`);
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.recipients && data.recipients.length > 0) {
        // Merge with existing recipients, avoiding duplicates
        const existingEmails = new Set(recipients.map((r) => r.email));
        const newRecipients = data.recipients.filter(
          (r: EmailRecipient) => !existingEmails.has(r.email)
        );

        setRecipients([...recipients, ...newRecipients]);
        toast.success(`Added ${newRecipients.length} recipients`);
        setShowRecipientDialog(false);
      } else {
        toast.info("No recipients found for this group");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load recipients");
    } finally {
      setLoadingRecipients(false);
    }
  }

  async function addTeamRecipients() {
    if (selectedTeams.length === 0 || !leagueId) {
      toast.error("Please select at least one team");
      return;
    }

    setLoadingRecipients(true);
    try {
      const response = await fetch(
        `/api/email/recipients?type=teams&leagueId=${leagueId}&teamIds=${selectedTeams.join(",")}`
      );
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.recipients && data.recipients.length > 0) {
        const existingEmails = new Set(recipients.map((r) => r.email));
        const newRecipients = data.recipients.filter(
          (r: EmailRecipient) => !existingEmails.has(r.email)
        );

        setRecipients([...recipients, ...newRecipients]);
        toast.success(`Added ${newRecipients.length} recipients from selected teams`);
        setSelectedTeams([]);
        setShowRecipientDialog(false);
      } else {
        toast.info("No recipients found for selected teams");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load team recipients");
    } finally {
      setLoadingRecipients(false);
    }
  }

  async function addGameRecipients() {
    if (selectedGames.length === 0 || !leagueId) {
      toast.error("Please select at least one game");
      return;
    }

    setLoadingRecipients(true);
    try {
      const response = await fetch(
        `/api/email/recipients?type=games&leagueId=${leagueId}&gameIds=${selectedGames.join(",")}`
      );
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.recipients && data.recipients.length > 0) {
        const existingEmails = new Set(recipients.map((r) => r.email));
        const newRecipients = data.recipients.filter(
          (r: EmailRecipient) => !existingEmails.has(r.email)
        );

        setRecipients([...recipients, ...newRecipients]);
        toast.success(`Added ${newRecipients.length} recipients from selected games`);
        setSelectedGames([]);
        setShowRecipientDialog(false);
      } else {
        toast.info("No recipients found for selected games");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load game recipients");
    } finally {
      setLoadingRecipients(false);
    }
  }

  function removeRecipient(email: string) {
    setRecipients(recipients.filter((r) => r.email !== email));
  }

  async function handleGenerate() {
    if (!emailType || !leagueId) {
      toast.error("Please select an email type");
      return;
    }

    setGenerating(true);
    try {
      // If we already have a template loaded, enhance it with AI
      const enhanceTemplate = previewMode && subject && html
        ? { subject, html }
        : undefined;

      const response = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: emailType,
          leagueId,
          enhanceTemplate,
          ...context,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.draft) {
        setSubject(data.draft.subject);
        setHtml(data.draft.html);
        setRecipients(data.draft.recipients || []);
        setPreviewMode(true);
        toast.success(
          enhanceTemplate
            ? "Email enhanced with AI! Review and edit as needed."
            : "Email generated! Review and edit before sending."
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate email");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!subject || !html) {
      toast.error("Please generate an email first");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/email/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: emailType,
          leagueId,
          subject,
          html,
          recipients,
          context,
          isAutomated: false,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.draft?.id) {
        setDraftId(data.draft.id);
        toast.success("Draft saved! You can send it later.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save draft");
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    if (!subject || !html) {
      toast.error("Please generate an email first");
      return;
    }

    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: emailType,
          leagueId,
          subject,
          html,
          recipients,
          context,
          isAutomated: false,
          skipPreview: false, // Always show preview for manual sends
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Email sent to ${data.sent || recipients.length} recipients!`);
      
      // Reset form
      setSubject("");
      setHtml("");
      setRecipients([]);
      setPreviewMode(false);
      setDraftId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Admin access required
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="font-mono text-[10px]">ADMIN</Badge>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground text-sm font-medium">{branding?.name || "League"}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Email Management</h1>
        <p className="text-muted-foreground">
          Generate, preview, and send emails to players and captains for this league
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Email
            </CardTitle>
            <CardDescription>
              Templates auto-load when you select a type. Optionally enhance with AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email Type</Label>
              <Select value={emailType} onValueChange={(v) => setEmailType(v as EmailType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="game_reminder">Game Reminder</SelectItem>
                  <SelectItem value="stat_reminder">Stat Reminder</SelectItem>
                  <SelectItem value="draft_notification">Draft Notification</SelectItem>
                  <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                  <SelectItem value="season_invite">Season Invite</SelectItem>
                  <SelectItem value="team_invite">Team Invite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {emailType === "game_reminder" && (
              <>
                <div>
                  <Label>Game Date</Label>
                  <Input
                    type="date"
                    onChange={(e) =>
                      setContext({
                        ...context,
                        gameDetails: {
                          ...context.gameDetails,
                          date: e.target.value,
                        } as any,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Game Time</Label>
                  <Input
                    type="time"
                    onChange={(e) =>
                      setContext({
                        ...context,
                        gameDetails: {
                          ...context.gameDetails,
                          time: e.target.value,
                        } as any,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Opponent</Label>
                  <Input
                    placeholder="Team name"
                    onChange={(e) =>
                      setContext({
                        ...context,
                        gameDetails: {
                          ...context.gameDetails,
                          opponent: e.target.value,
                        } as any,
                      })
                    }
                  />
                </div>
              </>
            )}

            <div>
              <Label>Recipient Name (optional)</Label>
              <Input
                placeholder="Player or Captain name"
                onChange={(e) =>
                  setContext({ ...context, recipientName: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Recipient Role</Label>
              <Select
                value={context.recipientRole || "player"}
                onValueChange={(v: any) =>
                  setContext({ ...context, recipientRole: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="captain">Captain</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tone</Label>
              <Select
                value={context.tone || "friendly"}
                onValueChange={(v: any) => setContext({ ...context, tone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Additional Context (optional)</Label>
              <Textarea
                placeholder="Any additional details for the AI to include..."
                onChange={(e) =>
                  setContext({ ...context, customContext: e.target.value })
                }
              />
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="use-ai"
                checked={useAIGeneration}
                onChange={(e) => setUseAIGeneration(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="use-ai" className="text-sm font-normal cursor-pointer">
                Enhance template with AI (optional)
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={loadEmailTemplate}
                variant="outline"
                disabled={generating}
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                Load Template
              </Button>
              {useAIGeneration && (
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Enhance with AI
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Preview/Edit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {previewMode ? <Eye className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
              {previewMode ? "Preview & Edit" : "Email Preview"}
            </CardTitle>
            <CardDescription>
              Review and edit the generated email before sending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewMode ? (
              <>
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject"
                  />
                </div>

                <div>
                  <Label>Content (HTML)</Label>
                  <Textarea
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    placeholder="Email HTML content"
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <Label>Recipients ({recipients.length})</Label>
                  <div className="space-y-2">
                    {recipients.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {recipients.map((r, i) => (
                          <Badge key={i} variant="outline" className="flex items-center gap-1">
                            {r.name || r.email}
                            <button
                              onClick={() => removeRecipient(r.email)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Dialog open={showRecipientDialog} onOpenChange={setShowRecipientDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add Recipients
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Select Recipients</DialogTitle>
                          <DialogDescription>
                            Choose recipient groups or add individual emails
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          {/* Quick Groups */}
                          <div>
                            <Label className="text-base font-semibold mb-3 block">
                              Quick Groups
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                onClick={() => addRecipientGroup("active-season-players")}
                                disabled={loadingRecipients}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                All Active Season Players
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => addRecipientGroup("active-season-captains")}
                                disabled={loadingRecipients}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                All Active Season Captains
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => addRecipientGroup("all-admins")}
                                disabled={loadingRecipients}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                All Admins
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => addRecipientGroup("all-league")}
                                disabled={loadingRecipients}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                Entire League
                              </Button>
                            </div>
                          </div>

                          {/* Select Teams */}
                          <div>
                            <Label className="text-base font-semibold mb-3 block">
                              Select Teams
                            </Label>
                            <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                              {availableTeams.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Loading teams...
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {availableTeams.map((team) => (
                                    <div key={team.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`team-${team.id}`}
                                        checked={selectedTeams.includes(team.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedTeams([...selectedTeams, team.id]);
                                          } else {
                                            setSelectedTeams(
                                              selectedTeams.filter((id) => id !== team.id)
                                            );
                                          }
                                        }}
                                      />
                                      <label
                                        htmlFor={`team-${team.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                      >
                                        {team.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {selectedTeams.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={addTeamRecipients}
                                disabled={loadingRecipients}
                              >
                                Add {selectedTeams.length} Team{selectedTeams.length > 1 ? "s" : ""}
                              </Button>
                            )}
                          </div>

                          {/* Select Games */}
                          <div>
                            <Label className="text-base font-semibold mb-3 block">
                              Select Games
                            </Label>
                            <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                              {availableGames.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Loading games...
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {availableGames.map((game) => {
                                    const gameDate = new Date(game.scheduled_at);
                                    const homeName = game.home_team?.name || "TBD";
                                    const awayName = game.away_team?.name || "TBD";
                                    return (
                                      <div key={game.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`game-${game.id}`}
                                          checked={selectedGames.includes(game.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedGames([...selectedGames, game.id]);
                                            } else {
                                              setSelectedGames(
                                                selectedGames.filter((id) => id !== game.id)
                                              );
                                            }
                                          }}
                                        />
                                        <label
                                          htmlFor={`game-${game.id}`}
                                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                        >
                                          {gameDate.toLocaleDateString()} - {homeName} vs {awayName}
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {selectedGames.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={addGameRecipients}
                                disabled={loadingRecipients}
                              >
                                Add {selectedGames.length} Game{selectedGames.length > 1 ? "s" : ""}
                              </Button>
                            )}
                          </div>

                          {/* Individual Email */}
                          <div>
                            <Label className="text-base font-semibold mb-3 block">
                              Add Individual Email
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="email@example.com"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const input = e.currentTarget;
                                    const email = input.value.trim();
                                    if (email && email.includes("@")) {
                                      const existingEmails = new Set(recipients.map((r) => r.email));
                                      if (!existingEmails.has(email)) {
                                        setRecipients([...recipients, { email }]);
                                        input.value = "";
                                        toast.success("Recipient added");
                                      } else {
                                        toast.error("Email already in recipients");
                                      }
                                    }
                                  }
                                }}
                              />
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                  const email = input?.value.trim();
                                  if (email && email.includes("@")) {
                                    const existingEmails = new Set(recipients.map((r) => r.email));
                                    if (!existingEmails.has(email)) {
                                      setRecipients([...recipients, { email }]);
                                      input.value = "";
                                      toast.success("Recipient added");
                                    } else {
                                      toast.error("Email already in recipients");
                                    }
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveDraft}
                    disabled={sending}
                    variant="outline"
                    className="flex-1"
                  >
                    {sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Save Draft
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sending || recipients.length === 0}
                    className="flex-1"
                  >
                    {sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send Email
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Generate an email to see preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
