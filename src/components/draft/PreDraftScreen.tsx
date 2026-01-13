"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DraftOrderAnimation } from "./DraftOrderAnimation";
import { getDraftTeamsWithCaptains, assignDraftOrder, getDraftOrder } from "@/lib/draft/draft-order";
import { activateDraft } from "@/lib/draft/actions";
import { toast } from "sonner";

interface PreDraftScreenProps {
  draftId: string;
  seasonName: string;
  isOwner?: boolean;
  onDraftActivated: () => void;
}

export function PreDraftScreen({
  draftId,
  seasonName,
  isOwner = false,
  onDraftActivated,
}: PreDraftScreenProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderAssigned, setOrderAssigned] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadTeams();
    checkOrderStatus();
  }, [draftId]);

  async function loadTeams() {
    setLoading(true);
    const result = await getDraftTeamsWithCaptains();
    if (result.error) {
      toast.error(result.error);
    } else {
      setTeams(result.teams || []);
    }
    setLoading(false);
  }

  async function checkOrderStatus() {
    const result = await getDraftOrder(draftId);
    if (result.order && result.order.length > 0) {
      setOrderAssigned(true);
      // Sort teams by draft order
      const orderedTeams = result.order
        .sort((a, b) => a.pick_position - b.pick_position)
        .map((o) => o.team);
      setTeams(orderedTeams);
    }
  }

  async function handleAssignOrder(order: Array<{ teamId: string; position: number }>) {
    setAssigning(true);
    const result = await assignDraftOrder(draftId);
    if (result.error) {
      toast.error(result.error);
      setAssigning(false);
    } else {
      setOrderAssigned(true);
      toast.success("Draft order assigned!");
      await checkOrderStatus();
      setAssigning(false);
    }
  }

  async function handleStartDraft() {
    const result = await activateDraft(draftId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Draft activated!");
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      if (onDraftActivated) {
        await onDraftActivated();
      }
    }
  }

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!orderAssigned && isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pre-Draft Setup</CardTitle>
          <CardDescription>
            {seasonName} • {teams.length} teams ready
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connected Captains */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Connected Captains</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={team.captain?.avatar_url || ""} />
                        <AvatarFallback>
                          {team.captain?.full_name
                            ?.split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2) || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{team.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {team.captain?.full_name}
                        </p>
                      </div>
                      <Badge className="bg-green-600">
                        <span className="w-2 h-2 bg-white rounded-full inline-block mr-2 animate-pulse" />
                        Ready
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Draft Order Animation */}
          <DraftOrderAnimation
            teams={teams}
            onOrderAssigned={handleAssignOrder}
            onStartDraft={handleStartDraft}
          />
        </CardContent>
      </Card>
    );
  }

  if (!orderAssigned && !isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Waiting for Draft Setup</CardTitle>
          <CardDescription>
            The league owner is setting up the draft order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-6xl mb-4 animate-spin">🎲</div>
            <p className="text-muted-foreground">
              Waiting for draft order to be assigned...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {teams.length} teams connected
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Order assigned, show final order
  return (
    <Card>
      <CardHeader>
        <CardTitle>Draft Order Assigned</CardTitle>
        <CardDescription>Ready to begin the draft</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
          {teams.map((team, index) => (
            <div
              key={team.id}
              className="w-20 h-20 rounded-lg border-4 flex flex-col items-center justify-center p-2"
              style={{
                backgroundColor: team.primary_color,
                borderColor: team.secondary_color,
              }}
            >
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span
                  className="text-white font-bold text-xs text-center"
                  style={{ color: team.secondary_color }}
                >
                  {team.short_name}
                </span>
              )}
              <Badge
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: team.secondary_color,
                  color: team.primary_color,
                }}
              >
                {index + 1}
              </Badge>
            </div>
          ))}
        </div>
        {isOwner && (
          <Button
            onClick={handleStartDraft}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            ✅ Start Draft
          </Button>
        )}
        {!isOwner && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Waiting for owner to start the draft...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
