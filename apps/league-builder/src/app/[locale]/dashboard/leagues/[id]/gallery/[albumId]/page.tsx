import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AlbumDetailClient } from '@/components/gallery/AlbumDetailClient';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string; albumId: string }>;
};

export default async function AlbumDetailPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId, albumId } = awaited;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .single();

  if (!league) notFound();

  const { data: album } = await (supabase
    .from('league_gallery') as any)
    .select('*')
    .eq('id', albumId)
    .eq('league_id', leagueId)
    .single();

  if (!album) notFound();

  const { data: photos } = await (supabase
    .from('gallery_photos') as any)
    .select('*')
    .eq('gallery_id', albumId)
    .order('display_order', { ascending: true });

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/gallery`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Gallery
          </Link>

          <h1 className="text-3xl font-black text-white tracking-tight">{album.title}</h1>
          {album.description && (
            <p className="text-neutral-400 mt-1">{album.description}</p>
          )}
        </div>

        <AlbumDetailClient
          leagueId={leagueId}
          locale={locale}
          album={album}
          photos={photos || []}
        />
      </div>
    </div>
  );
}
