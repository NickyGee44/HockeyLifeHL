import { Metadata } from "next";
import { requireLeagueRole } from "@/lib/auth/league-context";
import { getLeagueBrandingById } from "@/lib/leagues/branding";
import { BrandingForm } from "@/components/settings/BrandingForm";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Info } from "lucide-react";

/**
 * Branding Settings Page
 *
 * Allows league owners to customize their league's visual appearance:
 * - Colors (primary, secondary, accent)
 * - Logo, banner, favicon URLs
 * - Font family
 * - Custom CSS (advanced)
 * - Tagline
 *
 * Requires owner role.
 */

export const metadata: Metadata = {
  title: "Branding Settings",
  description: "Customize your league's appearance with colors, logos, and custom styles.",
};

interface BrandingSettingsPageProps {
  params: {
    league: string;
  };
}

export default async function BrandingSettingsPage({
  params,
}: BrandingSettingsPageProps) {
  // Require owner role for branding settings
  await requireLeagueRole(["owner"]);

  // Fetch current league branding
  const { data: branding, error } = await getLeagueBrandingById(params.league);

  if (error || !branding) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load league branding. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branding Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize your league's appearance with colors, logos, and custom styles.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <CardDescription className="text-sm text-blue-900">
              Changes will be reflected immediately across your league site. Preview your changes
              before saving to ensure everything looks perfect.
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      {/* Branding Form */}
      <BrandingForm initialBranding={branding} leagueId={params.league} />
    </div>
  );
}
