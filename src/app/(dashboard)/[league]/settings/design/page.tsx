import { Metadata } from "next";
import { requireLeagueRole } from "@/lib/auth/league-context";
import { getLeagueTemplate } from "@/lib/templates/actions";
import { DesignSettings } from "@/components/settings/DesignSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Paintbrush } from "lucide-react";

/**
 * Design Settings Page
 *
 * Allows league owners/admins to select and customize their site template:
 * - Choose from 5 professional templates
 * - Preview template before applying
 * - Customize colors with preset or custom colors
 * - See live preview of changes
 *
 * Requires owner or admin role.
 *
 * @since 2026-01-28
 * @agent Agent 1
 * @task Task 4.3 from ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md
 */

export const metadata: Metadata = {
  title: "Design Settings",
  description: "Choose your site template and customize your league's design.",
};

interface DesignSettingsPageProps {
  params: {
    league: string;
  };
}

export default async function DesignSettingsPage({
  params,
}: DesignSettingsPageProps) {
  // Require owner or admin role for design settings
  await requireLeagueRole(["owner", "admin"]);

  // Fetch current template configuration
  const result = await getLeagueTemplate(params.league);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Paintbrush className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Design Settings</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Choose your site template and customize colors to match your league's brand.
        </p>
      </div>

      {/* Error State */}
      {result.error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load design settings: {result.error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Design Settings Component */}
      {!result.error && (
        <DesignSettings
          leagueId={params.league}
          currentTemplate={result.data?.template || null}
          currentCustomizations={result.data?.customizations || {}}
        />
      )}
    </div>
  );
}
