import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { RegistrationFormConfigForm } from './RegistrationFormConfigForm';
import type { RegistrationFormConfig } from '@/lib/actions/league-settings';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const DEFAULT_CONFIG: RegistrationFormConfig = {
  levels: [],
  locations: [],
  nights: [],
  auto_approve: false,
  enabled_fields: {
    played_last_season: true,
    level: true,
    location_preference: true,
    preferred_night: true,
    referral_source: true,
    paid_team_rep: true,
  },
};

export default async function RegistrationFormSettingsPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const { data: leagueRaw, error } = await (supabase as any)
    .from('leagues')
    .select('id, name, registration_form_config')
    .eq('id', leagueId)
    .single() as { data: { id: string; name: string; registration_form_config: any } | null; error: any };

  if (error || !leagueRaw) {
    notFound();
  }

  const league = leagueRaw;

  const rawConfig = league.registration_form_config ?? {};
  const initialConfig: RegistrationFormConfig = {
    ...DEFAULT_CONFIG,
    ...rawConfig,
    enabled_fields: {
      ...DEFAULT_CONFIG.enabled_fields,
      ...(rawConfig.enabled_fields ?? {}),
    },
  };

  // Fetch existing divisions and venues so the form can offer one-click suggestions
  const [{ data: divisionsData }, { data: venuesData }] = await Promise.all([
    supabase
      .from('divisions')
      .select('name')
      .eq('league_id', leagueId)
      .order('name'),
    (supabase as any)
      .from('venues')
      .select('name')
      .eq('league_id', leagueId)
      .order('name'),
  ]);

  const suggestedDivisions = (divisionsData ?? []).map((d: { name: string }) => d.name);
  const suggestedVenues = (venuesData ?? []).map((v: { name: string }) => v.name);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/settings`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rink-500/10">
              <ClipboardList className="w-5 h-5 text-rink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Registration Form</h1>
              <p className="text-neutral-400 text-sm mt-0.5">
                Configure what fields appear on {league.name}&apos;s registration forms
              </p>
            </div>
          </div>
        </div>

        <RegistrationFormConfigForm
          leagueId={leagueId}
          initialConfig={initialConfig}
          suggestedDivisions={suggestedDivisions}
          suggestedVenues={suggestedVenues}
        />
      </div>
    </div>
  );
}
