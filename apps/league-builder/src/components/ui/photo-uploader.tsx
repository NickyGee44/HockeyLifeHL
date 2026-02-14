'use client';

import * as React from 'react';
import { useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Upload, X, Camera, Loader2, Check } from 'lucide-react';
import { Button } from '@hockey-life/ui';
import { cn } from '@hockey-life/ui/lib/utils';

import 'react-image-crop/dist/ReactCrop.css';

export interface PhotoUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
  onUpload?: (file: File) => Promise<{ url: string; path: string }>;
  onRemove?: (path: string) => Promise<void>;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  aspectRatio?: number;
  className?: string;
  disabled?: boolean;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function PhotoUploader({
  value,
  onChange,
  onUpload,
  onRemove,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'],
  aspectRatio = 1, // Square by default
  className,
  disabled = false,
}: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropper, setShowCropper] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setError(`Please upload a valid image (${acceptedTypes.map(t => t.split('/')[1]).join(', ')})`);
      return;
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      setError(`File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
      return;
    }

    // Create preview for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewSrc(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  }, [acceptedTypes, maxSizeBytes]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  }, [aspectRatio]);

  const getCroppedImage = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    // Set output size (max 500x500 for profile photos)
    const outputSize = 500;
    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputSize,
      outputSize
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.9
      );
    });
  }, [completedCrop]);

  const handleCropComplete = useCallback(async () => {
    if (!onUpload) {
      setError('Upload handler not configured');
      return;
    }

    const croppedBlob = await getCroppedImage();
    if (!croppedBlob) {
      setError('Failed to crop image');
      return;
    }

    // Create file from blob
    const croppedFile = new File([croppedBlob], 'profile-photo.jpg', {
      type: 'image/jpeg',
    });

    setIsUploading(true);
    setError(null);

    try {
      const result = await onUpload(croppedFile);
      onChange?.(result.url);
      setShowCropper(false);
      setPreviewSrc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [getCroppedImage, onUpload, onChange]);

  const handleCancelCrop = useCallback(() => {
    setShowCropper(false);
    setPreviewSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleRemove = useCallback(async () => {
    if (!value || !onRemove) return;

    setIsUploading(true);
    setError(null);

    try {
      // Extract path from URL
      const url = new URL(value);
      const pathParts = url.pathname.split('/');
      const path = pathParts.slice(pathParts.indexOf('player-photos') + 1).join('/');
      await onRemove(path);
      onChange?.('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove photo');
    } finally {
      setIsUploading(false);
    }
  }, [value, onRemove, onChange]);

  const triggerFileSelect = () => {
    inputRef.current?.click();
  };

  // Cropper Modal
  if (showCropper && previewSrc) {
    return (
      <div className={cn('fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4', className)}>
        <div className="bg-neutral-900 rounded-2xl p-6 max-w-lg w-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Crop Your Photo</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancelCrop}
              disabled={isUploading}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex justify-center bg-black/50 rounded-lg overflow-hidden">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              circularCrop
              className="max-h-[400px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={previewSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                className="max-h-[400px] object-contain"
              />
            </ReactCrop>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelCrop}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropComplete}
              disabled={isUploading || !completedCrop}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Photo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Photo Preview or Upload Area */}
      {value ? (
        <div className="relative inline-block">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-rink-500/50 bg-neutral-800">
            <Image
              src={value}
              alt="Profile photo"
              className="w-full h-full object-cover"
              fill
              sizes="128px"
            />
          </div>

          {/* Overlay Buttons */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
            <div className="absolute inset-0 bg-black/60 rounded-full" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative z-10 bg-white/20 hover:bg-white/30 text-white"
              onClick={triggerFileSelect}
              disabled={disabled || isUploading}
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative z-10 bg-red-500/20 hover:bg-red-500/30 text-red-400"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={disabled || isUploading}
          className={cn(
            'w-32 h-32 rounded-full border-2 border-dashed border-neutral-600',
            'flex flex-col items-center justify-center gap-2',
            'bg-neutral-800/50 text-neutral-400',
            'hover:border-rink-500/50 hover:text-rink-500 hover:bg-neutral-800',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-rink-500 focus:ring-offset-2 focus:ring-offset-neutral-900',
            (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <>
              <Upload className="h-8 w-8" />
              <span className="text-xs">Upload Photo</span>
            </>
          )}
        </button>
      )}

      {/* Error Display */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-neutral-500">
        PNG, JPG or WebP. Max {Math.round(maxSizeBytes / 1024 / 1024)}MB.
      </p>
    </div>
  );
}
