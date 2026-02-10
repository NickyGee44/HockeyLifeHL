"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveScorekeeperNotes } from "@/lib/scorekeepers/actions";

interface CommissionerNotesProps {
  assignmentId: string;
  initialNotes: string;
}

export function CommissionerNotes({ assignmentId, initialNotes }: CommissionerNotesProps) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [isPending, startTransition] = useTransition();

  const onSave = () => {
    startTransition(async () => {
      const result = await saveScorekeeperNotes(assignmentId, notes);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Notes saved and league admin notified");
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commissioner Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Record incidents, officiating concerns, or anything the league owner/admin should review.
        </p>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Example: Ref crew arrived late; game started 12 minutes after scheduled time."
          className="w-full min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          maxLength={3000}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{notes.length}/3000</span>
          <Button type="button" onClick={onSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Notes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
