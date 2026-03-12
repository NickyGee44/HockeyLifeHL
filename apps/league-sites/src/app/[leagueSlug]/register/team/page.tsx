import type { Metadata } from 'next';
import { getLeagueBySlug } from '@/lib/data';
import {
  getLeagueRegistrationData,
  getLeagueWaiver,
} from '@/lib/actions/registration';
import { TeamRegistrationForm } from '@/components/registration/TeamRegistrationForm';
import { XCircle } from 'lucide-react';
import { pickRegistrationSeason } from '@/lib/registration/seasons';

const DEFAULT_WAIVER_CONTENT = `# Participant Waiver and Release of Liability

## PLEASE READ CAREFULLY BEFORE SIGNING

By accepting this waiver, I acknowledge and agree to the following:

### Assumption of Risk
I understand that participating in recreational hockey involves inherent risks, including but not limited to:
- Physical contact and collisions with other players, equipment, or structures
- Falls on ice surfaces
- Injuries from pucks, sticks, and other equipment
- Muscle strains, sprains, fractures, and other physical injuries

### Release of Liability
I voluntarily assume all risks associated with participation and hereby release and hold harmless the league, its officers, directors, employees, volunteers, and affiliated organizations from any claims, damages, or injuries arising from participation.

### Medical Authorization
In case of emergency, I authorize league officials to obtain medical treatment on behalf of team members if they are unable to provide consent.

### Rules and Conduct
I agree that all team members will:
- Follow all league rules and regulations
- Demonstrate good sportsmanship at all times
- Respect officials, opponents, and teammates
- Wear appropriate protective equipment as required

### Acknowledgment
I have read this waiver, understand its contents, and accept it on behalf of my team.`;

interface TeamRegisterPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default async function TeamRegisterPage({ params }: TeamRegisterPageProps) {
  const { leagueSlug } = await params;

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

  // Find active season
  const now = new Date();
  const activeSeason = pickRegistrationSeason((league.seasons as any[]) || [], now);

  if (!activeSeason) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Registration Closed
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Team registration for {league.name} is not currently open.
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

  const waiverResult = await getLeagueWaiver(league.id);
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

  const leagueFormConfig = (league as any).registration_form_config ?? {};

  return (
    <div className="py-8">
      <div className="max-w-2xl mx-auto px-4 mb-4 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Registering as a player?{' '}
          <a
            href={`/${leagueSlug}/register`}
            className="text-[var(--league-primary)] hover:underline font-medium"
          >
            Click here for player registration
          </a>
        </p>
      </div>

      <TeamRegistrationForm
        leagueId={league.id}
        leagueSlug={leagueSlug}
        seasonId={activeSeason.id}
        leagueName={league.name}
        seasonName={activeSeason.name}
        waiverContent={waiver.content}
        waiverVersion={waiver.version}
        waiverDocumentUrl={waiver.document_url}
        waiverDocumentName={waiver.document_name}
        waiverDocumentMimeType={waiver.document_mime_type}
        leagueFormConfig={leagueFormConfig}
      />
    </div>
  );
}

export async function generateMetadata({ params }: TeamRegisterPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'Team Registration - Not Found' };
  }

  return {
    title: `Team Registration | ${league.name}`,
    description: `Register your team for ${league.name}`,
  };
}
