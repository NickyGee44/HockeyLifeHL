'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@hockey-life/ui';
import { Plus, Trash2, Eye, EyeOff, ImageIcon } from 'lucide-react';
import { createAlbum, deleteAlbum, updateAlbum } from '@/lib/actions/gallery';
import { LogoUploader } from '@/components/ui/logo-uploader';
import { uploadGalleryCover, deleteGalleryCover } from '@/lib/actions/image-upload';

interface Album {
  id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  is_published: boolean;
  photo_count: number;
  created_at: string;
}

interface GalleryAdminClientProps {
  leagueId: string;
  locale: string;
  albums: Album[];
}

export function GalleryAdminClient({ leagueId, locale, albums }: GalleryAdminClientProps) {
  const t = useTranslations('gallery');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');

  async function handleCreateAlbum() {
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await createAlbum({
        leagueId,
        title: title.trim(),
        description: description.trim() || undefined,
        coverPhotoUrl: coverPhotoUrl.trim() || undefined,
      });

      if (result.success) {
        setTitle('');
        setDescription('');
        setCoverPhotoUrl('');
        setShowForm(false);
        router.refresh();
      }
    });
  }

  async function handleDeleteAlbum(albumId: string) {
    if (!confirm(t('confirmDeleteAlbum'))) return;

    startTransition(async () => {
      await deleteAlbum(albumId);
      router.refresh();
    });
  }

  async function handleTogglePublish(albumId: string, currentlyPublished: boolean) {
    startTransition(async () => {
      await updateAlbum(albumId, { isPublished: !currentlyPublished });
      router.refresh();
    });
  }

  return (
    <div>
      {/* New Album Button */}
      <div className="mb-6">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
              'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
            )}
          >
            <Plus className="w-4 h-4" />
            {t('newAlbum')}
          </button>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('newAlbum')}</h3>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('albumTitle')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                placeholder={t('albumTitle')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                rows={2}
                placeholder={t('description')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('coverPhoto')}</label>
              <LogoUploader
                value={coverPhotoUrl}
                onChange={(url) => setCoverPhotoUrl(url)}
                onUpload={async (file) => {
                  const result = await uploadGalleryCover(leagueId, file);
                  if (!result.success) throw new Error(result.error);
                  return result.data;
                }}
                onRemove={async () => {
                  if (coverPhotoUrl) {
                    await deleteGalleryCover(leagueId, coverPhotoUrl);
                    setCoverPhotoUrl('');
                  }
                }}
                aspectRatio={16 / 9}
                outputSize={1200}
                maxSizeBytes={5 * 1024 * 1024}
                placeholder="Upload Cover Photo"
                shape="square"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateAlbum}
                disabled={isPending || !title.trim()}
                className={cn(
                  'px-5 py-2 rounded-lg font-semibold text-sm',
                  'bg-rink-500 text-black hover:bg-rink-400 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isPending ? 'Creating...' : 'Create Album'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2 rounded-lg font-semibold text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Albums Grid */}
      {albums.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">{t('noAlbums')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <div
              key={album.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden group hover:border-neutral-700 transition-colors"
            >
              {/* Cover Image */}
              <Link href={`/${locale}/dashboard/leagues/${leagueId}/gallery/${album.id}`}>
                <div className="relative aspect-video bg-neutral-800">
                  {album.cover_photo_url ? (
                    <Image
                      src={album.cover_photo_url}
                      alt={album.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-neutral-600" />
                    </div>
                  )}
                  {/* Photo count badge */}
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-white">
                    {album.photo_count} {t('photos')}
                  </div>
                </div>
              </Link>

              {/* Album Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/${locale}/dashboard/leagues/${leagueId}/gallery/${album.id}`}
                    className="text-white font-semibold hover:text-rink-400 transition-colors"
                  >
                    {album.title}
                  </Link>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full shrink-0',
                      album.is_published
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-neutral-700 text-neutral-400'
                    )}
                  >
                    {album.is_published ? t('published') : t('unpublished')}
                  </span>
                </div>
                {album.description && (
                  <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{album.description}</p>
                )}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-800">
                  <button
                    onClick={() => handleTogglePublish(album.id, album.is_published)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                    title={album.is_published ? t('unpublished') : t('published')}
                  >
                    {album.is_published ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteAlbum(album.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
