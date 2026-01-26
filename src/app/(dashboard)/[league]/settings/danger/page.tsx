"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DangerZonePage() {
  const handleArchive = () => {
    toast.error("League archived");
  };

  const handleDelete = () => {
    const confirm = window.confirm("Are you absolutely sure? This cannot be undone.");
    if (confirm) {
      toast.error("Deleting league...");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Archive League</CardTitle>
          <CardDescription>
            Temporarily hide your league from the public and disable new registrations.
            All data will be preserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={handleArchive}>
            Archive League
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Delete League</CardTitle>
          <CardDescription>
            Permanently delete your league and all associated data (teams, stats, games).
            This action is irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDelete}>
            Delete League Forever
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
