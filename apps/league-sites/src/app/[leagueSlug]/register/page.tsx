import type { Metadata } from 'next';
import { getLeagueBySlug } from '@/lib/data';
import { getPublicCaptainInvitePreview } from '@/lib/captain/invite-preview';
import {
  getLeagueRegistrationData,
  getSeasonRegistrationPaymentConfig,
  getRegistrationDraft,
  getMyRegistrationStatus,
  getLeagueWaiver,
  getRegistrationJourneyData,
} from '@/lib/actions/registration';
import { getCaptainInvitePrefill } from '@/lib/actions/captain-player-invites';
import { CaptainInviteCookieBridge } from '@/components/registration/CaptainInviteCookieBridge';
import { RegistrationWizard } from '@/components/registration';
import { Check, Clock, XCircle } from 'lucide-react';
import {
  formatRegistrationIntent,
  formatTeamReturnStatus,
} from '@/lib/registration/intents';
import { pickRegistrationSeason } from '@/lib/registration/seasons';

// Default waiver for leagues without a custom one
const DEFAULT_WAIVER_CONTENT = `# Participant Waiver and Release of Liability

## PLEASE READ CAREFULLY BEFORE SIGNING

By signing this waiver, I acknowledge and agree to the following:

### Assumption of Risk
I understand that participating in recreational hockey involves inherent risks, including but not limited to:
- Physical contact and collisions with other players, equipment, or structures
- Falls on ice surfaces
- Injuries from pucks, sticks, and other equipment
- Muscle strains, sprains, fractures, and other physical injuries

### Release of Liability
I voluntarily assume all risks associated with participation and hereby release and hold harmless the league, its officers, directors, employees, volunteers, and affiliated organizations from any claims, damages, or injuries arising from my participation.

### Medical Authorization
In case of emergency, I authorize league officials to obtain medical treatment on my behalf if I am unable to provide consent.

### Rules and Conduct
I agree to:
- Follow all league rules and regulations
- Demonstrate good sportsmanship at all times
- Respect officials, opponents, and teammates
- Wear appropriate protective equipment as required

### Media Release
I grant permission for my likeness to be used in league promotional materials, photos, and videos.

### Acknowledgment
I have read this waiver, understand its contents, and sign it voluntarily.`;

interface RegisterPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams?: Promise<{ captainInvite?: string }>;
}

function getLeagueBaseUrl(league: any, leagueSlug: string) {
  if (league?.custom_domain && league?.custom_domain_verified) {
    return /^https?:\/\//i.test(league.custom_domain)
      ? league.custom_domain
      : `https://${league.custom_domain}`;
  }

  if (league?.subdomain) {
    return `https://${league.subdomain}.beerleaguehockey.ca`;
  }

  return `https://${leagueSlug}.beerleaguehockey.ca`;
}

export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const { leagueSlug } = await params;
  const { captainInvite } = (await searchParams) ?? {};

  // Get league data with seasons and teams
  const league = await getLeagueRegistrationData(leagueSlug);

  if (!league) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            League Not Found
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            The league you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  const captainInvitePrefill = captainInvite
    ? await getCaptainInvitePrefill(captainInvite)
    : null;
  const inviteInitialData = captainInvitePrefill?.success ? captainInvitePrefill.data : null;

  // Find active season with open registration, but allow valid captain invites
  // to target their explicit season even if public registration is closed.
  const now = new Date();
  const openSeason = pickRegistrationSeason((league.seasons as any[]) || [], now);
  const inviteSeason = inviteInitialData?.season_id
    ? ((league.seasons as any[]) || []).find((season: any) => season.id === inviteInitialData.season_id) || null
    : null;
  const activeSeason = inviteSeason || openSeason;

  if (!activeSeason) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Registration Closed
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Registration for {league.name} is not currently open. Please check back later or
            contact the league administrator.
          </p>
          <a
            href={`/${leagueSlug}`}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity"
          >
            Back to League
          </a>
        </div>
      </div>
    );
  }

  // Check existing registration status
  const existingStatus = await getMyRegistrationStatus(league.id, activeSeason.id);
  if (existingStatus.success && existingStatus.data) {
    const status = existingStatus.data.status;

    if (status === 'approved') {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              Already Registered!
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              You are already registered for {activeSeason.name} in {league.name}.
            </p>
            <a
              href={`/${leagueSlug}`}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity"
            >
              Back to League
            </a>
          </div>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              Registration Pending
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Your registration for {activeSeason.name} is awaiting approval.
              {existingStatus.data.draftData?.registration_intent && (
                <>
                  {' '}We have it marked as{' '}
                  <strong>{formatRegistrationIntent(existingStatus.data.draftData.registration_intent)}</strong>.
                </>
              )}
              {existingStatus.data.draftData?.team_return_status && (
                <>
                  {' '}Status: <strong>{formatTeamReturnStatus(existingStatus.data.draftData.team_return_status)}</strong>.
                </>
              )}{' '}
              You will receive an email once it has been reviewed.
            </p>
            <a
              href={`/${leagueSlug}`}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity"
            >
              Back to League
            </a>
          </div>
        </div>
      );
    }
  }

  // Load draft, waiver, and payment settings
  const [draftResult, waiverResult, registrationConfig, journeyResult] = await Promise.all([
    getRegistrationDraft(league.id, activeSeason.id),
    getLeagueWaiver(league.id),
    getSeasonRegistrationPaymentConfig(league.id, activeSeason.id),
    getRegistrationJourneyData(league.id, activeSeason.id),
  ]);

  if (!registrationConfig.feeConfigured) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Registration Opening Soon
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            {league.name} is still setting the player registration fee for {activeSeason.name}.
            Player registration will open as soon as that fee is configured.
          </p>
          <a
            href={`/${leagueSlug}`}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity"
          >
            Back to League
          </a>
        </div>
      </div>
    );
  }

  const initialData = draftResult.success ? (draftResult.data ?? inviteInitialData) : inviteInitialData;
  const waiver =
    waiverResult.success && waiverResult.data
      ? waiverResult.data
      : {
          content: DEFAULT_WAIVER_CONTENT,
          version: 'v1',
          content_hash: '',
          document_url: null,
          document_name: null,
          document_mime_type: null,
        };

  const teams = (league.teams || []).map((team: any) => ({
    id: team.id,
    name: team.name,
  }));

  const leagueFormConfig = (league as any).registration_form_config ?? {};
  const journeyData =
    journeyResult.success && journeyResult.data
      ? journeyResult.data
      : { previousTeams: [], confirmedTeamIds: [], teamReturnStatuses: {} };

  return (
    <div className="py-8">
      <CaptainInviteCookieBridge inviteId={captainInvite || null} />
      {/* Team registration entry point */}
      <div className="max-w-2xl mx-auto px-4 mb-4 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Registering a team?{' '}
          <a
            href={`/${leagueSlug}/register/team`}
            className="text-[var(--league-primary)] hover:underline font-medium"
          >
            Click here for team registration
          </a>
        </p>
      </div>

      <RegistrationWizard
        leagueId={league.id}
        leagueSlug={leagueSlug}
        seasonId={activeSeason.id}
        leagueName={league.name}
        seasonName={activeSeason.name}
        teams={teams}
        registrationFee={registrationConfig.registrationFee}
        platformFeeCents={registrationConfig.platformFeeCents}
        platformFeePercent={registrationConfig.platformFeePercent}
        totalChargeCents={registrationConfig.totalChargeCents}
        chargeIncludesPlatformFee={registrationConfig.chargeIncludesPlatformFee}
        feeCollectionModel={registrationConfig.feeCollectionModel}
        feeBasis={registrationConfig.feeBasis}
        paymentMode={registrationConfig.paymentMode}
        waiverContent={waiver.content}
        waiverVersion={waiver.version}
        waiverContentHash={waiver.content_hash}
        waiverDocumentUrl={waiver.document_url}
        waiverDocumentName={waiver.document_name}
        waiverDocumentMimeType={waiver.document_mime_type}
        initialData={initialData}
        leagueFormConfig={leagueFormConfig}
        previousTeams={journeyData.previousTeams}
        confirmedTeamIds={journeyData.confirmedTeamIds}
        teamReturnStatuses={journeyData.teamReturnStatuses}
      />
    </div>
  );
}

export async function generateMetadata({ params, searchParams }: RegisterPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const { captainInvite } = (await searchParams) ?? {};
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'Register - Not Found' };
  }

  const defaultTitle = `Register | ${league.name}`;
  const defaultDescription = `Register as a player for ${league.name}`;

  if (!captainInvite) {
    return {
      title: defaultTitle,
      description: defaultDescription,
    };
  }

  const invitePreview = await getPublicCaptainInvitePreview(captainInvite);
  if (!invitePreview || (invitePreview.leagueSlug && invitePreview.leagueSlug !== leagueSlug)) {
    return {
      title: defaultTitle,
      description: defaultDescription,
    };
  }

  const baseUrl = getLeagueBaseUrl(league, leagueSlug).replace(/\/$/, '');
  const inviteImageUrl = `${baseUrl}/${leagueSlug}/register/invite-image?captainInvite=${captainInvite}`;
  const title = invitePreview.shareTitle;
  const description = invitePreview.branding.kind === 'league'
    ? `Join the ${invitePreview.leagueName} spare player pool on Beer League Hockey.`
    : `Complete your registration for ${invitePreview.teamName} on Beer League Hockey.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: invitePreview.registrationUrl,
      images: [
        {
          url: inviteImageUrl,
          width: 1200,
          height: 630,
          alt: `${invitePreview.branding.name} player invite`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [inviteImageUrl],
    },
  };
}
