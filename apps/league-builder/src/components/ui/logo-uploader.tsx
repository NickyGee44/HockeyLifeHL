'use client';

import * as React from 'react';
import { useCallback, useState, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Upload, X, ImageIcon, Loader2, Check, Download, Trash2 } from 'lucide-react';
import { Button, cn } from '@hockey-life/ui';

import 'react-image-crop/dist/ReactCrop.css';

export interface LogoUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
  onUpload?: (file: File) => Promise<{ url: string; path: string }>;
  onRemove?: () => Promise<void>;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  aspectRatio?: number;
  outputSize?: number;
  className?: string;
  disabled?: boolean;
  shape?: 'square' | 'circle';
  placeholder?: string;
  showDownload?: boolean;
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
        width: 80,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function LogoUploader({
  value,
  onChange,
  onUpload,
  onRemove,
  maxSizeBytes = 2 * 1024 * 1024, // 2MB default for logos
  acceptedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
  aspectRatio = 1, // Square by default
  outputSize = 500, // Output size for the cropped image
  className,
  disabled = false,
  shape = 'square',
  placeholder = 'Upload Logo',
  showDownload = false,
}: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropper, setShowCropper] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setOriginalFile(file);

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

    // SVG files don't need cropping - upload directly
    if (file.type === 'image/svg+xml') {
      handleDirectUpload(file);
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

  const handleDirectUpload = async (file: File) => {
    if (!onUpload) {
      setError('Upload handler not configured');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await onUpload(file);
      onChange?.(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

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

    // Set output size
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Create transparent background for PNG
    ctx.clearRect(0, 0, outputSize, outputSize);

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

    // Determine output type based on original file
    const outputType = originalFile?.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const quality = outputType === 'image/png' ? 1 : 0.92;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        outputType,
        quality
      );
    });
  }, [completedCrop, outputSize, originalFile]);

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

    // Determine extension based on original file
    const ext = originalFile?.type === 'image/png' ? 'png' : 'jpg';
    const croppedFile = new File([croppedBlob], `logo.${ext}`, {
      type: originalFile?.type === 'image/png' ? 'image/png' : 'image/jpeg',
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
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [getCroppedImage, onUpload, onChange, originalFile]);

  const handleCancelCrop = useCallback(() => {
    setShowCropper(false);
    setPreviewSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setOriginalFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleRemove = useCallback(async () => {
    if (!onRemove) {
      // Just clear the value if no remove handler
      onChange?.('');
      return;
    }

    setIsRemoving(true);
    setError(null);

    try {
      await onRemove();
      onChange?.('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove logo');
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove, onChange]);

  const handleDownload = useCallback(() => {
    if (!value) return;

    const link = document.createElement('a');
    link.href = value;
    link.download = 'league-logo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [value]);

  const triggerFileSelect = () => {
    inputRef.current?.click();
  };

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  // Cropper Modal
  if (showCropper && previewSrc) {
    return (
      <div className={cn('fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4', className)}>
        <div className="bg-neutral-900 rounded-2xl p-6 max-w-lg w-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Crop Your Logo</h3>
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
              circularCrop={shape === 'circle'}
              className="max-h-[400px]"
            >
              <img
                ref={imgRef}
                src={previewSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                className="max-h-[400px] object-contain"
              />
            </ReactCrop>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag to reposition. The logo will be resized to {outputSize}x{outputSize}px.
          </p>

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
                  Save Logo
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
        disabled={disabled || isUploading || isRemoving}
      />

      {/* Logo Preview or Upload Area */}
      {value ? (
        <div className="flex items-start gap-4">
          {/* Logo Preview */}
          <div className={cn(
            'relative w-28 h-28 overflow-hidden border-2 border-rink-500/30 bg-neutral-800/50',
            shapeClass
          )}>
            <img
              src={value}
              alt="League logo"
              className="w-full h-full object-contain p-2"
            />
            {(isUploading || isRemoving) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="w-6 h-6 text-rink-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFileSelect}
              disabled={disabled || isUploading || isRemoving}
              className="justify-start"
            >
              <Upload className="mr-2 h-4 w-4" />
              Change Logo
            </Button>

            {showDownload && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={disabled || isUploading || isRemoving}
                className="justify-start text-muted-foreground"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isUploading || isRemoving}
              className="justify-start text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={disabled || isUploading}
          className={cn(
            'w-28 h-28 border-2 border-dashed border-neutral-600',
            'flex flex-col items-center justify-center gap-2',
            'bg-neutral-800/50 text-neutral-400',
            'hover:border-rink-500/50 hover:text-rink-500 hover:bg-neutral-800',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-rink-500 focus:ring-offset-2 focus:ring-offset-neutral-900',
            (disabled || isUploading) && 'opacity-50 cursor-not-allowed',
            shapeClass
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs text-center px-2">{placeholder}</span>
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
        PNG, JPG, SVG or WebP. Max {Math.round(maxSizeBytes / 1024 / 1024)}MB. Recommended: 500x500px
      </p>
    </div>
  );
}
