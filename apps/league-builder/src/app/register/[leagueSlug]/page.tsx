import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getRegistrationDraft,
  getLeagueWaiver,
  getMyRegistrationStatus,
} from '@/lib/actions/player-registration';
import {
  RegistrationWizardContainer,
  Step1RegistrationType,
  Step2PersonalInfo,
  Step3SkillAssessment,
  Step4PhotoUpload,
  Step5Waiver,
  Step6Payment,
  Step7Confirmation,
} from '@/components/player-registration';
import { Loader2 } from 'lucide-react';

interface RegisterPageProps {
  params: { leagueSlug: string };
  searchParams: { step?: string; season?: string };
}

// Default waiver content if no template exists
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

async function getLeagueBySlug(slug: string) {
  const supabase = await createClient();

  const { data: league, error } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      slug,
      seasons (
        id,
        name,
        start_date,
        end_date,
        registration_opens_at,
        registration_closes_at,
        registration_type,
        status
      ),
      teams (
        id,
        name
      )
    `)
    .eq('slug', slug)
    .single();

  if (error || !league) {
    return null;
  }

  return league;
}

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export default async function RegisterPage({
  params,
  searchParams,
}: RegisterPageProps) {
  // Verify user is logged in
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirect=/register/${params.leagueSlug}`);
  }

  // Get league by slug
  const league = await getLeagueBySlug(params.leagueSlug);
  if (!league) {
    notFound();
  }

  // Find active season for registration
  const now = new Date();
  const activeSeason = league.seasons?.find((season: any) => {
    // If specific season requested, use that
    if (searchParams.season && season.id === searchParams.season) {
      return true;
    }
    // Otherwise find season with open registration
    if (season.registration_opens_at && season.registration_closes_at) {
      const opens = new Date(season.registration_opens_at);
      const closes = new Date(season.registration_closes_at);
      return now >= opens && now <= closes;
    }
    return season.status === 'upcoming' || season.status === 'active';
  });

  if (!activeSeason) {
    // No active registration period
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Registration Closed
          </h1>
          <p className="text-neutral-400 mb-6">
            Registration for {league.name} is not currently open. Please check
            back later or contact the league administrator.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gold-500 text-black font-semibold hover:bg-gold-400 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Check if user already registered for this season
  const existingStatus = await getMyRegistrationStatus(league.id, activeSeason.id);
  if (existingStatus.success && existingStatus.data) {
    const status = existingStatus.data.status;

    if (status === 'approved') {
      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Already Registered!
            </h1>
            <p className="text-neutral-400 mb-6">
              You're already registered for {activeSeason.name} in {league.name}.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gold-500 text-black font-semibold hover:bg-gold-400 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Registration Pending
            </h1>
            <p className="text-neutral-400 mb-6">
              Your registration for {activeSeason.name} is awaiting approval.
              You'll receive an email once it's been reviewed.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gold-500 text-black font-semibold hover:bg-gold-400 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  // Load existing draft if any
  const draftResult = await getRegistrationDraft(league.id, activeSeason.id);
  const initialData = draftResult.success ? draftResult.data : null;

  // Get waiver template
  const waiverResult = await getLeagueWaiver(league.id);
  const waiver = waiverResult.success && waiverResult.data
    ? waiverResult.data
    : {
        content: DEFAULT_WAIVER_CONTENT,
        version: 'v1',
        content_hash: '',
      };

  // Get available teams
  const teams = (league.teams || []).map((team: any) => ({
    id: team.id,
    name: team.name,
  }));

  // Determine current step from URL
  const currentStep = searchParams.step ? parseInt(searchParams.step, 10) : 1;

  return (
    <div className="min-h-screen bg-neutral-950">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
          </div>
        }
      >
        <RegistrationWizardContainer
          leagueId={league.id}
          seasonId={activeSeason.id}
          leagueName={league.name}
          initialData={initialData}
          registrationFee={0}
          teams={teams}
          waiverContent={waiver.content}
          waiverVersion={waiver.version}
          waiverContentHash={waiver.content_hash}
        >
          {/* Render appropriate step based on URL */}
          {currentStep === 1 && <Step1RegistrationType />}
          {currentStep === 2 && <Step2PersonalInfo />}
          {currentStep === 3 && <Step3SkillAssessment />}
          {currentStep === 4 && <Step4PhotoUpload />}
          {currentStep === 5 && <Step5Waiver />}
          {currentStep === 6 && <Step6Payment />}
          {currentStep === 7 && <Step7Confirmation />}
        </RegistrationWizardContainer>
      </Suspense>
    </div>
  );
}

export async function generateMetadata({ params }: RegisterPageProps) {
  const league = await getLeagueBySlug(params.leagueSlug);

  if (!league) {
    return {
      title: 'Register - Not Found',
    };
  }

  return {
    title: `Register for ${league.name}`,
    description: `Complete your player registration for ${league.name}`,
  };
}
