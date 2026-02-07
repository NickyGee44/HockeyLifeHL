import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StaffAdminClient } from '@/components/staff/StaffAdminClient';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function StaffPage({ params }: Props) {
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
    .select('id, name')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  const { data: staff } = await (supabase
    .from('league_staff') as any)
    .select('*')
    .eq('league_id', leagueId)
    .order('display_order', { ascending: true });

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <h1 className="text-3xl font-black text-white tracking-tight">Staff Directory</h1>
          <p className="text-neutral-400 mt-1">
            Manage staff members for {league.name}
          </p>
        </div>

        <StaffAdminClient
          leagueId={leagueId}
          locale={locale}
          staff={staff || []}
        />
      </div>
    </div>
  );
}
