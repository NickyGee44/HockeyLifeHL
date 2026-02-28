'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@hockey-life/ui';
import { Plus, Trash2, Save, Eye, EyeOff, ImageIcon } from 'lucide-react';
import { updateAlbum, addPhotos, updatePhoto, deletePhoto } from '@/lib/actions/gallery';
import { uploadGalleryCover, deleteGalleryCover, uploadGalleryPhoto } from '@/lib/actions/image-upload';
import { LogoUploader } from '@/components/ui/logo-uploader';

interface Album {
  id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  is_published: boolean;
}

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  display_order: number;
}

interface AlbumDetailClientProps {
  leagueId: string;
  locale: string;
  album: Album;
  photos: Photo[];
}

export function AlbumDetailClient({ leagueId, locale: _locale, album, photos }: AlbumDetailClientProps) {
  const t = useTranslations('gallery');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Album edit state
  const [editTitle, setEditTitle] = useState(album.title);
  const [editDescription, setEditDescription] = useState(album.description || '');
  const [editCoverUrl, setEditCoverUrl] = useState(album.cover_photo_url || '');

  // Add photo state
  const [showAddForm, setShowAddForm] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');

  // Caption editing
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editCaptionText, setEditCaptionText] = useState('');

  async function handleSaveAlbum() {
    startTransition(async () => {
      await updateAlbum(album.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        coverPhotoUrl: editCoverUrl || undefined });
      router.refresh();
    });
  }

  async function handleTogglePublish() {
    startTransition(async () => {
      await updateAlbum(album.id, { isPublished: !album.is_published });
      router.refresh();
    });
  }

  async function handleAddPhoto() {
    if (!photoUrl) return;

    startTransition(async () => {
      await addPhotos(album.id, [
        { url: photoUrl.trim(), caption: photoCaption.trim() || undefined },
      ]);
      setPhotoUrl('');
      setPhotoCaption('');
      setShowAddForm(false);
      router.refresh();
    });
  }

  async function handleSaveCaption(photoId: string) {
    startTransition(async () => {
      await updatePhoto(photoId, { caption: editCaptionText });
      setEditingCaptionId(null);
      router.refresh();
    });
  }

  async function handleDeletePhoto(photoId: string) {
    if (!confirm(t('confirmDeletePhoto'))) return;

    startTransition(async () => {
      await deletePhoto(photoId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* Album Settings */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">{t('editAlbum')}</h2>
          <button
            onClick={handleTogglePublish}
            disabled={isPending}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              album.is_published
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            )}
          >
            {album.is_published ? (
              <>
                <Eye className="w-4 h-4" />
                {t('published')}
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                {t('unpublished')}
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t('albumTitle')}</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t('coverPhoto')}</label>
            <LogoUploader
              value={editCoverUrl}
              onChange={(url) => setEditCoverUrl(url)}
              onUpload={async (file) => {
                const result = await uploadGalleryCover(leagueId, file);
                if (!result.success) throw new Error(result.error);
                return result.data;
              }}
              onRemove={async () => {
                if (editCoverUrl) await deleteGalleryCover(leagueId, editCoverUrl);
                setEditCoverUrl('');
              }}
              aspectRatio={16 / 9}
              outputSize={1200}
              shape="square"
              placeholder="Upload cover photo"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">{t('description')}</label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
            rows={2}
          />
        </div>
        <button
          onClick={handleSaveAlbum}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm bg-rink-500 text-black hover:bg-rink-400 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      {/* Photos Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Photos ({photos.length})
          </h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-4 h-4" />
              {t('addPhotos')}
            </button>
          )}
        </div>

        {/* Add Photo Form */}
        {showAddForm && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4 mb-6">
            <h3 className="text-white font-medium">{t('addPhotos')}</h3>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('photoUrl')}</label>
              <LogoUploader
                value={photoUrl}
                onChange={(url) => setPhotoUrl(url)}
                onUpload={async (file) => {
                  const result = await uploadGalleryPhoto(leagueId, file);
                  if (!result.success) throw new Error(result.error);
                  return result.data;
                }}
                onRemove={async () => setPhotoUrl('')}
                aspectRatio={4 / 3}
                outputSize={1600}
                shape="square"
                placeholder="Upload photo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('caption')}</label>
              <input
                type="text"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddPhoto}
                disabled={isPending || !photoUrl}
                className="px-5 py-2 rounded-lg font-semibold text-sm bg-rink-500 text-black hover:bg-rink-400 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Adding...' : 'Add Photo'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2 rounded-lg font-semibold text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        {photos.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900/50 rounded-xl border border-neutral-800">
            <ImageIcon className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
            <p className="text-neutral-400">{t('noPhotos')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden"
              >
                <div className="relative aspect-square">
                  <Image
                    src={photo.thumbnail_url || photo.url}
                    alt={photo.caption || 'Photo'}
                    fill
                    className="object-cover"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={isPending}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Caption */}
                <div className="p-2">
                  {editingCaptionId === photo.id ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={editCaptionText}
                        onChange={(e) => setEditCaptionText(e.target.value)}
                        className="flex-1 text-xs rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCaption(photo.id);
                          if (e.key === 'Escape') setEditingCaptionId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveCaption(photo.id)}
                        className="text-xs text-rink-400 hover:text-rink-300"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <p
                      className="text-xs text-neutral-400 cursor-pointer hover:text-white transition-colors truncate"
                      onClick={() => {
                        setEditingCaptionId(photo.id);
                        setEditCaptionText(photo.caption || '');
                      }}
                    >
                      {photo.caption || 'Click to add caption'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
