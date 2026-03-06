import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GeneralSettingsForm } from './GeneralSettingsForm';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function GeneralSettingsPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select(
      'id, name, description, city, state_province, country, timezone, contact_email, contact_phone'
    )
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[General Settings] Error fetching league:', leagueError?.message);
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/settings`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>

          <h1 className="text-3xl font-black text-white tracking-tight">General Settings</h1>
          <p className="text-neutral-400 mt-1">
            Update basic information for {league.name}
          </p>
        </div>

        <GeneralSettingsForm
          leagueId={leagueId}
          initialData={{
            name: league.name,
            description: league.description || '',
            city: league.city || '',
            state_province: league.state_province || '',
            country: league.country || '',
            timezone: league.timezone || '',
            contact_email: league.contact_email || '',
            contact_phone: league.contact_phone || '',
          }}
        />
      </div>
    </div>
  );
}
