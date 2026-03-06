import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GalleryAdminClient } from '@/components/gallery/GalleryAdminClient';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function GalleryPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Fetch albums with photo counts
  const { data: albums } = await (supabase
    .from('league_gallery') as any)
    .select('*, gallery_photos(count)')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  const albumsWithCount = (albums || []).map((album: any) => ({
    ...album,
    photo_count: album.gallery_photos?.[0]?.count || 0,
  }));

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

          <h1 className="text-3xl font-black text-white tracking-tight">Photo Gallery</h1>
          <p className="text-neutral-400 mt-1">
            Manage photo albums for {league.name}
          </p>
        </div>

        <GalleryAdminClient
          leagueId={leagueId}
          locale={locale}
          albums={albumsWithCount}
        />
      </div>
    </div>
  );
}
