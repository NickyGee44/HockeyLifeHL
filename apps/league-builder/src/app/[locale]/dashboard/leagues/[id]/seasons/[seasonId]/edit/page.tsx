/**
 * Edit Season Page
 *
 * Form for editing an existing season.
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';
import { EditSeasonForm } from '@/components/dashboard/leagues/EditSeasonForm';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
  searchParams?: Promise<{ [key: string]: string }>;
};

export default async function EditSeasonPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId, seasonId } = awaited;
  setRequestLocale(locale);

  const supabase = await createClient();

  // Get current user
  const {
    data: { user } } = await supabase.auth.getUser();
  if (!user) {
    nextRedirect(`/${locale}/login`);
  }

  // Get season with league info
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select(
      `
      *,
      league:leagues(
        id,
        name,
        slug,
        primary_color
      )
    `
    )
    .eq('id', seasonId)
    .eq('league_id', leagueId)
    .single();

  if (seasonError || !season) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/seasons/${seasonId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {season.name}
          </Link>

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: season.league?.primary_color || '#22D3EE' }}
            >
              <Edit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Edit Season</h1>
              <p className="text-neutral-400 mt-1">
                Update settings for {season.name}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <EditSeasonForm
          leagueId={leagueId}
          season={{
            id: season.id,
            name: season.name,
            status: season.status,
            start_date: season.start_date,
            end_date: season.end_date,
            registration_type: season.registration_type,
            games_per_cycle: season.games_per_cycle,
            max_players_per_team: season.max_players_per_team,
            allow_team_selection: season.allow_team_selection,
            playoff_format: season.playoff_format }}
        />
      </div>
    </div>
  );
}
