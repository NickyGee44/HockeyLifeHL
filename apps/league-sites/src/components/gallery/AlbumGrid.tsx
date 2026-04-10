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
      <div className="text-center py-16">
        <ImageIcon className="w-16 h-16 mx-auto text-[var(--color-text-muted)] mb-4" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map((album) => (
        <Link
          key={album.id}
          href={`/${leagueSlug}/gallery/${album.id}`}
          className="group block glass-card overflow-hidden rounded-xl"
        >
          {/* Cover Image */}
          <div className="relative aspect-video bg-[var(--color-background)] overflow-hidden">
            {album.cover_photo_url ? (
              <Image
                src={album.cover_photo_url}
                alt={album.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-[var(--color-text-muted)]" />
              </div>
            )}
            {/* Photo count badge */}
            {album.photo_count !== undefined && (
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1 text-sm text-white font-medium">
                {album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Album Info */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)] transition-colors">
              {album.title}
            </h3>
            {album.description && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                {album.description}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
