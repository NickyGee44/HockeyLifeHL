import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface TeamIdRedirectPageProps {
  params: Promise<{ leagueSlug: string; teamId: string }>;
}

export default async function TeamIdRedirectPage({ params }: TeamIdRedirectPageProps) {
  const { leagueSlug, teamId } = await params;
  const supabase = await createClient();

  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', leagueSlug)
    .maybeSingle();

  if (!league?.id) {
    notFound();
  }

  const { data: team } = await supabase
    .from('teams')
    .select('slug')
    .eq('id', teamId)
    .eq('league_id', league.id)
    .maybeSingle();

  if (!team?.slug) {
    notFound();
  }

  redirect(`/${leagueSlug}/teams/${team.slug}`);
}
