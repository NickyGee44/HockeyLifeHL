'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Globe,
  CreditCard,
  Send,
  LayoutDashboard,
  ExternalLink,
  Sparkles,
  Shuffle,
} from 'lucide-react';
import { Button } from '@hockey-life/ui';

interface Step9NextStepsProps {
  leagueId: string;
  leagueSlug: string;
  leagueName: string;
  seasonName: string;
  location: string;
  teamCount: number;
  needsPaymentSetup: boolean;
  addonsSelected: boolean;
  domainRequested: boolean;
  isDraftLeague: boolean;
}


interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
  external?: boolean;
}

function ActionCard({ icon, title, description, buttonLabel, href, external }: ActionCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {external ? (
        <Button variant="outline" size="sm" asChild>
          <a href={href} target="_blank" rel="noopener noreferrer">
            {buttonLabel}
          </a>
        </Button>
      ) : (
        <Button variant="outline" size="sm" asChild>
          <Link href={href}>{buttonLabel}</Link>
        </Button>
      )}
    </div>
  );
}

export function Step9NextSteps({
  leagueId,
  leagueSlug,
  leagueName,
  seasonName,
  location,
  teamCount,
  needsPaymentSetup,
  addonsSelected,
  domainRequested,
  isDraftLeague,
}: Step9NextStepsProps) {
  const sitesBaseUrl = process.env.NEXT_PUBLIC_LEAGUE_SITES_URL?.replace(/\/+$/, '') ?? '';
  const leagueSiteUrl = sitesBaseUrl ? `${sitesBaseUrl}/${leagueSlug}` : `/${leagueSlug}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8 px-4">
      {/* ── Success Header ── */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-4 dark:bg-green-900/30">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          League Created Successfully!
        </h1>
        <p className="text-lg text-muted-foreground">{leagueName}</p>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">League</p>
          <p className="mt-1 text-sm font-semibold truncate" title={leagueName}>
            {leagueName}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Season</p>
          <p className="mt-1 text-sm font-semibold truncate" title={seasonName}>
            {seasonName}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
          <p className="mt-1 text-sm font-semibold truncate" title={location}>
            {location}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Teams</p>
          <p className="mt-1 text-sm font-semibold">
            {teamCount > 0 ? `${teamCount} team${teamCount !== 1 ? 's' : ''}` : 'No teams yet'}
          </p>
        </div>
      </div>

      {/* ── Recommended Next Steps ── */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Recommended Next Steps</h2>

        {teamCount > 0 && (
          <ActionCard
            icon={<Send className="h-5 w-5 text-primary" />}
            title="Invite Team Captains"
            description="Send invitations to team captains so they can set up their rosters"
            buttonLabel="Invite Captains"
            href={`/dashboard/leagues/${leagueId}/teams`}
          />
        )}

        {isDraftLeague && (
          <ActionCard
            icon={<Shuffle className="h-5 w-5 text-primary" />}
            title="Set Up Draft"
            description="Configure draft settings, populate the player pool, and launch the draft room"
            buttonLabel="Draft Setup"
            href={`/dashboard/leagues/${leagueId}/draft`}
          />
        )}

        {needsPaymentSetup && (
          <ActionCard
            icon={<CreditCard className="h-5 w-5 text-primary" />}
            title="Set Up Payments"
            description="Connect Stripe to start collecting registration fees"
            buttonLabel="Set Up Payments"
            href={`/dashboard/leagues/${leagueId}/payments`}
          />
        )}

        {domainRequested && (
          <ActionCard
            icon={<Globe className="h-5 w-5 text-primary" />}
            title="Complete Domain Setup"
            description="Finish setting up your custom domain"
            buttonLabel="Domain Settings"
            href={`/dashboard/leagues/${leagueId}/settings`}
          />
        )}

        {addonsSelected && (
          <ActionCard
            icon={<Sparkles className="h-5 w-5 text-primary" />}
            title="Activate Add-ons"
            description="Complete billing setup for your premium features"
            buttonLabel="Manage Add-ons"
            href={`/dashboard/leagues/${leagueId}/billing`}
          />
        )}

        <ActionCard
          icon={<Globe className="h-5 w-5 text-primary" />}
          title="Customize Your Website"
          description="Personalize your league's public website"
          buttonLabel="Website Editor"
          href="/website-editor"
        />

        <ActionCard
          icon={<ExternalLink className="h-5 w-5 text-primary" />}
          title="Preview Your Site"
          description="See what your league site looks like"
          buttonLabel="View Site"
          href={leagueSiteUrl}
          external
        />
      </div>

      {/* ── Dashboard CTA ── */}
      <div className="text-center pt-4">
        <Button size="lg" asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-5 w-5" />
            Go to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
