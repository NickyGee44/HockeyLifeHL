"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DomainVerification } from "@/components/admin/DomainVerification";
import { getLeagueDetails } from "@/lib/admin/league-management";
import { toast } from "sonner";

/**
 * League Domain Configuration Page
 * Manage subdomain and custom domain settings
 */
export default function LeagueDomainPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeague();
  }, [leagueId]);

  async function loadLeague() {
    setLoading(true);
    const result = await getLeagueDetails(leagueId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setLeague(result.league);
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">League not found</p>
            <Button asChild variant="outline">
              <Link href="/admin/leagues">Back to Leagues</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Domain Configuration</h1>
          <p className="text-muted-foreground mt-2">{league.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/leagues/${leagueId}`}>
            Back to League
          </Link>
        </Button>
      </div>

      {/* Current Subdomain */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Subdomain</CardTitle>
          <CardDescription>
            Automatically assigned subdomain on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-primary">
              {league.subdomain}.beerleaguehockey.ca
            </p>
            <p className="text-sm text-muted-foreground">
              This is the default URL for accessing this league. It's automatically configured and always available.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Domain Configuration */}
      <DomainVerification
        leagueId={leagueId}
        currentDomain={league.custom_domain}
        verified={league.custom_domain_verified}
      />

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Custom Domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Benefits of Custom Domains</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Professional appearance with your own domain</li>
              <li>Better brand recognition</li>
              <li>Improved SEO and marketing</li>
              <li>Custom email addresses (when configured)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Requirements</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>You must own the domain</li>
              <li>Access to DNS settings at your registrar</li>
              <li>Ability to add CNAME or A records</li>
              <li>DNS propagation time (5-60 minutes typically)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Common Issues</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>DNS records not propagated yet - wait and try again</li>
              <li>Incorrect CNAME value - double-check the instructions</li>
              <li>Domain already in use - each domain can only be used once</li>
              <li>SSL certificate pending - may take up to 24 hours</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
