'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { GalleryPhoto } from '@/lib/types';

interface PhotoLightboxProps {
  photos: GalleryPhoto[];
  initialIndex?: number;
}

export function PhotoLightbox({ photos, initialIndex = 0 }: PhotoLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const open = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close, goNext, goPrev]);

  const currentPhoto = photos[currentIndex];

  return (
    <>
      {/* Photo Grid (clickable thumbnails) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:auto-rows-[150px] lg:grid-cols-6 xl:auto-rows-[170px]">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => open(index)}
            className={`group glass-card relative aspect-square min-h-11 overflow-hidden rounded-lg transition-all hover:border-[var(--league-primary)]/50 lg:aspect-auto lg:rounded-2xl ${
              index % 9 === 0
                ? 'lg:col-span-2 lg:row-span-2'
                : index % 7 === 0
                  ? 'lg:col-span-2'
                  : ''
            }`}
          >
            <Image
              src={photo.thumbnail_url || photo.url}
              alt={photo.caption || `Photo ${index + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {isOpen && currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={close}
          />

          {/* Content */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 sm:p-8">
            {/* Close button */}
            <button
              onClick={close}
              className="glass-control absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation - Previous */}
            {photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="glass-control absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Main Image */}
            <div className="relative max-w-full max-h-[80vh] w-full h-full flex items-center justify-center">
              <Image
                src={currentPhoto.url}
                alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Navigation - Next */}
            {photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="glass-control absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Caption and counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-center">
              {currentPhoto.caption && (
                <p className="text-white text-sm mb-2 max-w-md">{currentPhoto.caption}</p>
              )}
              <p className="text-white/60 text-xs">
                {currentIndex + 1} / {photos.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
