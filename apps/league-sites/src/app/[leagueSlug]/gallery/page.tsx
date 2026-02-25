import { notFound } from 'next/navigation';
import { ImageIcon } from 'lucide-react';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getGalleryAlbums } from '@/lib/data';
import { AlbumGrid } from '@/components/gallery/AlbumGrid';
import type { Metadata } from 'next';

interface GalleryPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'Gallery | League Not Found' };
  }

  return {
    title: `Photo Gallery | ${league.name}`,
    description: `View photo galleries from ${league.name}`,
  };
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const albums = await getGalleryAlbums(league.id);

  return (
    <SubscriptionWall>
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--league-primary)]/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[var(--league-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Photo Gallery
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            {albums.length} album{albums.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AlbumGrid albums={albums} leagueSlug={leagueSlug} />
      </div>
    </div>
    </SubscriptionWall>
  );
}
