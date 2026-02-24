import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { getGoaliePool } from '@/lib/actions/goalie-marketplace';
import { GoaliePoolManagementClient } from '@/components/goalie-marketplace';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function GoaliePoolSettingsPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  const goaliePool = await getGoaliePool(leagueId);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/settings`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Settings
          </Link>

          <h1 className="text-3xl font-black text-white tracking-tight">Goalie Pool</h1>
          <p className="text-neutral-400 mt-1">Manage substitute goalies for {league.name}</p>
        </div>

        <GoaliePoolManagementClient
          leagueId={leagueId}
          initialGoalies={goaliePool.success ? goaliePool.data : []}
        />
      </div>
    </div>
  );
}
