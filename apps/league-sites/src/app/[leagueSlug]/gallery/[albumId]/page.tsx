import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getAlbumWithPhotos } from '@/lib/data';
import { PhotoLightbox } from '@/components/gallery/PhotoLightbox';
import type { Metadata } from 'next';

interface AlbumPageProps {
  params: Promise<{ leagueSlug: string; albumId: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string; albumId: string }>;
}): Promise<Metadata> {
  const { leagueSlug, albumId } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'Album | League Not Found' };
  }

  const result = await getAlbumWithPhotos(albumId);

  return {
    title: result ? `${result.album.title} | ${league.name}` : 'Album Not Found',
    description: result?.album.description || `Photo album from ${league.name}`,
  };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { leagueSlug, albumId } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const result = await getAlbumWithPhotos(albumId);

  if (!result) notFound();

  const { album, photos } = result;

  return (
    <SubscriptionWall>
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] lg:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--league-primary)_12%,transparent),color-mix(in_srgb,var(--color-surface)_92%,transparent))]">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <Link
            href={`/${leagueSlug}/gallery`}
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--league-primary)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Gallery
          </Link>

          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] lg:text-4xl lg:font-black">
            {album.title}
          </h1>
          {album.description && (
            <p className="text-[var(--color-text-secondary)] mt-1">{album.description}</p>
          )}
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:max-w-7xl">
        {photos.length === 0 ? (
          <div className="rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface)]/65 py-16 text-center lg:py-24">
            <ImageIcon className="w-16 h-16 mx-auto text-[var(--league-primary)]/70 mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              No photos in this album yet.
            </p>
          </div>
        ) : (
          <PhotoLightbox photos={photos} />
        )}
      </div>
    </div>
    </SubscriptionWall>
  );
}
