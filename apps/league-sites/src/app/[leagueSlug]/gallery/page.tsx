import { notFound } from 'next/navigation';
import { ImageIcon } from 'lucide-react';
import { SubscriptionWall, SectionHeading } from '@/components/shared';
import { getLeagueBySlug, getGalleryAlbums, getSeasons } from '@/lib/data';
import { AlbumGrid } from '@/components/gallery/AlbumGrid';
import type { Metadata } from 'next';
import type { GalleryAlbum, Season } from '@/lib/types';

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

function groupAlbumsBySeason(
  albums: GalleryAlbum[],
  seasons: Season[],
): { season: Season; albums: GalleryAlbum[] }[] {
  const seasonMap = new Map(seasons.map((s) => [s.id, s]));
  const groups = new Map<string, GalleryAlbum[]>();

  for (const album of albums) {
    if (!album.season_id || !seasonMap.has(album.season_id)) continue;
    const list = groups.get(album.season_id);
    if (list) {
      list.push(album);
    } else {
      groups.set(album.season_id, [album]);
    }
  }

  // Return in the same order as seasons (most recent first)
  return seasons
    .filter((s) => groups.has(s.id))
    .map((s) => ({ season: s, albums: groups.get(s.id)! }));
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const [albums, seasons] = await Promise.all([
    getGalleryAlbums(league.id),
    getSeasons(league.id),
  ]);

  const seasonGroups = groupAlbumsBySeason(albums, seasons);

  // Albums without a matching season
  const ungroupedAlbums = albums.filter(
    (a) => !a.season_id || !seasons.some((s) => s.id === a.season_id),
  );

  return (
    <SubscriptionWall>
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-10">
        <div className="glass-chrome rounded-[28px] border border-[var(--color-border)] p-6 lg:rounded-[32px] lg:p-8">
          <SectionHeading
            title="Photo Gallery"
            icon={<ImageIcon className="w-5 h-5 text-[var(--league-primary)]" />}
          />
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Game nights, team moments, and stories from around the rink.</p>
        </div>

        {albums.length === 0 ? (
          <AlbumGrid albums={[]} leagueSlug={leagueSlug} />
        ) : (
          <>
            {seasonGroups.map(({ season, albums: seasonAlbums }) => (
              <section key={season.id} className="glass-card rounded-[28px] p-5 md:p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-secondary)] mb-4">
                  {season.name}
                </h3>
                <AlbumGrid albums={seasonAlbums} leagueSlug={leagueSlug} />
              </section>
            ))}
            {ungroupedAlbums.length > 0 && (
              <section className="glass-card rounded-[28px] p-5 md:p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-secondary)] mb-4">
                  Other
                </h3>
                <AlbumGrid albums={ungroupedAlbums} leagueSlug={leagueSlug} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
    </SubscriptionWall>
  );
}
