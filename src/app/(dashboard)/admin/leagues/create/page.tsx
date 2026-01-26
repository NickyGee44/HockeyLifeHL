import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LeagueCreationWizard } from "@/components/admin/LeagueCreationWizard";

/**
 * Create New League Page
 * Multi-step wizard for creating a league
 */
export default function CreateLeaguePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create New League</h1>
          <p className="text-muted-foreground mt-2">
            Set up a new league instance
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/leagues">
            Cancel
          </Link>
        </Button>
      </div>

      {/* Creation Wizard */}
      <LeagueCreationWizard />
    </div>
  );
}
