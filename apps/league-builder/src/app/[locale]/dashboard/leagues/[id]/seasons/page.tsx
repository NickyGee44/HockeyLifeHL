/**
 * Seasons Management Page
 *
 * Centralized hub for managing all seasons within a league.
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';
import { getLeagueSeasons } from '@/lib/actions/seasons';
import { SeasonsTable } from '@/components/seasons/SeasonsTable';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function SeasonsPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    nextRedirect(`/${locale}/login`);
  }

  // Get league info
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, slug, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Get seasons via server action
  const result = await getLeagueSeasons(leagueId);
  const seasons = result.success ? (result.data ?? []) : [];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: league.primary_color || '#22D3EE' }}
              >
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Seasons</h1>
                <p className="text-neutral-400 text-sm">
                  {seasons.length} {seasons.length === 1 ? 'season' : 'seasons'}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/seasons/new`}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-4 h-4" />
              New Season
            </Link>
          </div>
        </div>

        {/* Seasons Table */}
        <SeasonsTable seasons={seasons} leagueId={leagueId} locale={locale} />
      </div>
    </div>
  );
}
