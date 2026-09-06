import Image from 'next/image';
import Link from 'next/link';
import { ImageIcon } from 'lucide-react';
import type { GalleryAlbum } from '@/lib/types';

interface AlbumGridProps {
  albums: GalleryAlbum[];
  leagueSlug: string;
}

export function AlbumGrid({ albums, leagueSlug }: AlbumGridProps) {
  if (albums.length === 0) {
    return (
      <div className="glass-card-strong rounded-[28px] py-16 text-center lg:py-20">
        <ImageIcon className="w-16 h-16 mx-auto text-[var(--league-primary)]/70 mb-4" />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          No Photo Albums
        </h3>
        <p className="text-[var(--color-text-secondary)]">
          Check back later for photos from the league.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:hidden">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} leagueSlug={leagueSlug} />
        ))}
      </div>

      <div className="hidden columns-3 gap-5 lg:block xl:columns-4">
        {albums.map((album, index) => (
          <div key={album.id} className="mb-5 break-inside-avoid">
            <AlbumCard
              album={album}
              leagueSlug={leagueSlug}
              className={index % 5 === 0 ? 'lg:[&_.album-cover]:aspect-[4/5]' : index % 3 === 0 ? 'lg:[&_.album-cover]:aspect-square' : ''}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function AlbumCard({
  album,
  leagueSlug,
  className = '',
}: {
  album: GalleryAlbum;
  leagueSlug: string;
  className?: string;
}) {
  return (
    <Link
      href={`/${leagueSlug}/gallery/${album.id}`}
      className={`group glass-card block overflow-hidden rounded-[24px] shadow-[0_24px_70px_-58px_rgba(0,0,0,0.95)] transition-all duration-300 hover:-translate-y-0.5 ${className}`}
    >
      <div className="album-cover relative aspect-video overflow-hidden bg-[var(--color-surface)]/35">
        {album.cover_photo_url ? (
          <Image
            src={album.cover_photo_url}
            alt={album.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--color-surface-hover),var(--color-background-elevated))]">
            <ImageIcon className="h-12 w-12 text-[var(--league-primary)]/55" />
          </div>
        )}
        {album.photo_count !== undefined && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
            {album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--league-primary)]">
          {album.title}
        </h3>
      </div>
    </Link>
  );
}
