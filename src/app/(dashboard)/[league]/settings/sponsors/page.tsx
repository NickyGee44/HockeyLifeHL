import { getLeagueSponsors } from "@/lib/sponsors/actions";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default async function SponsorsSettingsPage({
  params,
}: {
  params: Promise<{ league: string }>;
}) {
  const { league } = await params;
  const { sponsors } = await getLeagueSponsors(league);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Sponsors</h3>
        <p className="text-sm text-muted-foreground">
          Manage your league sponsors and partners. These will be displayed on your landing page.
        </p>
      </div>
      <Separator />

      <div className="flex justify-end">
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Sponsor
        </Button>
      </div>

      <div className="grid gap-4">
        {sponsors.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-muted-foreground mb-4">No sponsors added yet.</p>
              <Button variant="outline" size="sm">Add your first sponsor</Button>
            </CardContent>
          </Card>
        ) : (
          sponsors.map((sponsor) => (
            <Card key={sponsor.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-4">
                  {sponsor.logo_url ? (
                    <div className="relative h-12 w-12 border rounded p-1 bg-white">
                      <Image
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs font-bold">
                      {sponsor.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{sponsor.name}</CardTitle>
                    <CardDescription>{sponsor.tier} Tier</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground truncate">
                  <a href={sponsor.website_url} target="_blank" rel="noreferrer" className="hover:underline">
                    {sponsor.website_url}
                  </a>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="bg-muted/50 p-4 rounded-lg border border-border">
        <h4 className="text-sm font-semibold mb-2">About Platform Sponsors</h4>
        <p className="text-xs text-muted-foreground">
          Platform-wide sponsors are managed by LeagueOS administrators. 
          They help keep the platform affordable for all leagues. 
          As a Pro league, you can contact us to discuss revenue sharing for platform-level ads.
        </p>
      </div>
    </div>
  );
}
