import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GameRulesForm } from './GameRulesForm';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function GameRulesPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, settings')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[Game Rules] Error fetching league:', leagueError?.message);
    notFound();
  }

  const settings = (league.settings as Record<string, unknown>) || {};
  const penaltyRules = Array.isArray(settings.penalty_rules)
    ? (settings.penalty_rules as { type: string; minutes: number }[])
    : [];

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

          <h1 className="text-3xl font-black text-white tracking-tight">Game Rules</h1>
          <p className="text-neutral-400 mt-1">
            Configure penalty types and durations for {league.name}
          </p>
        </div>

        <GameRulesForm
          leagueId={leagueId}
          initialRules={penaltyRules}
        />
      </div>
    </div>
  );
}
