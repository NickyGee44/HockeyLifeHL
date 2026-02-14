'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@hockey-life/ui';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';

interface LogoUploaderProps {
  currentLogo?: string | null;
  teamName: string;
  primaryColor?: string;
  onUpload: (file: File) => Promise<{ success?: boolean; error?: string; data?: { url: string } }>;
  onRemove?: () => void;
  className?: string;
}

export function LogoUploader({
  currentLogo,
  teamName,
  primaryColor = '#22D3EE',
  onUpload,
  onRemove,
  className,
}: LogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG';
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return 'File too large. Maximum size is 2MB';
    }

    return null;
  };

  const processFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      const result = await onUpload(file);
      if (result.error) {
        setError(result.error);
        setPreview(currentLogo || null);
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      setPreview(currentLogo || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [onUpload, currentLogo]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-neutral-300">
        Team Logo
      </label>

      <div
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200',
          'bg-neutral-900/50',
          isDragging
            ? 'border-rink-500 bg-rink-500/5'
            : 'border-neutral-700 hover:border-neutral-600',
          isUploading && 'pointer-events-none opacity-70'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />

        {preview ? (
          // Preview Mode
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={preview}
                  alt={`${teamName} logo`}
                  className="w-24 h-24 rounded-xl object-contain bg-neutral-800 p-2"
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                    <Loader2 className="w-6 h-6 text-rink-500 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-1">Logo uploaded</p>
                <p className="text-xs text-neutral-400 mb-3">
                  Click to replace or drag a new image
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                    )}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isUploading}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                    )}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Upload Mode
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 text-center focus:outline-none"
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                {isDragging ? (
                  <Upload className="w-8 h-8" style={{ color: primaryColor }} />
                ) : (
                  <ImageIcon className="w-8 h-8" style={{ color: primaryColor }} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">
                  {isDragging ? 'Drop image here' : 'Upload team logo'}
                </p>
                <p className="text-xs text-neutral-400">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  PNG, JPEG, WebP, or SVG up to 2MB
                </p>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Placeholder preview when no logo */}
      {!preview && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {teamName.slice(0, 2).toUpperCase() || 'TM'}
          </div>
          <div className="text-sm text-neutral-400">
            Without a logo, team initials will be used
          </div>
        </div>
      )}
    </div>
  );
}

export default LogoUploader;
