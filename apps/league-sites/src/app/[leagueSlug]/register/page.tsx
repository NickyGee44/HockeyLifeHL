import type { Metadata } from 'next';
import { getLeagueBySlug } from '@/lib/data';
import {
  getLeagueRegistrationData,
  getSeasonRegistrationFee,
  getRegistrationDraft,
  getMyRegistrationStatus,
  getLeagueWaiver,
} from '@/lib/actions/registration';
import { RegistrationWizard } from '@/components/registration';
import { Check, Clock, XCircle } from 'lucide-react';

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
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { leagueSlug } = await params;

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

  // Find active season with open registration
  const now = new Date();
  const activeSeason = league.seasons?.find((season: any) => {
    if (season.registration_opens_at && season.registration_closes_at) {
      const opens = new Date(season.registration_opens_at);
      const closes = new Date(season.registration_closes_at);
      return now >= opens && now <= closes;
    }
    return season.status === 'upcoming' || season.status === 'active';
  });

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

  // Load draft, waiver, and fee data
  const [draftResult, waiverResult, registrationFee] = await Promise.all([
    getRegistrationDraft(league.id, activeSeason.id),
    getLeagueWaiver(league.id),
    getSeasonRegistrationFee(league.id, activeSeason.id),
  ]);

  const initialData = draftResult.success ? (draftResult.data ?? null) : null;
  const waiver =
    waiverResult.success && waiverResult.data
      ? waiverResult.data
      : { content: DEFAULT_WAIVER_CONTENT, version: 'v1', content_hash: '' };

  const teams = (league.teams || []).map((team: any) => ({
    id: team.id,
    name: team.name,
  }));

  const leagueFormConfig = (league as any).registration_form_config ?? {};

  return (
    <div className="py-8">
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
        registrationFee={registrationFee}
        waiverContent={waiver.content}
        waiverVersion={waiver.version}
        waiverContentHash={waiver.content_hash}
        initialData={initialData}
        leagueFormConfig={leagueFormConfig}
      />
    </div>
  );
}

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'Register - Not Found' };
  }

  return {
    title: `Register | ${league.name}`,
    description: `Register as a player for ${league.name}`,
  };
}
