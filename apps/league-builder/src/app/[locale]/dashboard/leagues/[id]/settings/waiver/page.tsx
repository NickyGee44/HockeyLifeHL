import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WaiverSettingsForm } from './WaiverSettingsForm';
import { SignedWaiversTable } from './SignedWaiversTable';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function WaiverSettingsPage({ params }: Props) {
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

  // Fetch active waiver template
  const { data: waiver } = await supabase
    .from('league_waiver_templates')
    .select('id, title, content, version, content_hash, updated_at')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .single();

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

          <h1 className="text-3xl font-black text-white tracking-tight">
            Waiver Settings
          </h1>
          <p className="text-neutral-400 mt-1">
            Manage the liability waiver for {league.name}
          </p>
        </div>

        <div className="space-y-8">
          <WaiverSettingsForm
            leagueId={leagueId}
            initialData={
              waiver
                ? {
                    title: waiver.title,
                    content: waiver.content,
                    version: waiver.version,
                    updatedAt: waiver.updated_at,
                  }
                : null
            }
          />

          <SignedWaiversTable leagueId={leagueId} />
        </div>
      </div>
    </div>
  );
}
