'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadProfilePhoto, deleteProfilePhoto } from '@/lib/actions/profile';

interface PhotoUploadProps {
  currentPhotoUrl: string | null;
  onUploadSuccess?: (newUrl: string) => void;
  onDeleteSuccess?: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function PhotoUpload({
  currentPhotoUrl,
  onUploadSuccess,
  onDeleteSuccess,
}: PhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentPhotoUrl;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a JPG, PNG, or WebP image.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size is ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setUploadState('error');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Start upload
    setUploadState('uploading');
    setErrorMessage('');
    setUploadProgress(0);

    // Simulate progress (since fetch doesn't support progress natively)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadProfilePhoto(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        setUploadState('success');
        setPreviewUrl(result.data.url);
        onUploadSuccess?.(result.data.url);

        // Reset to idle after showing success
        setTimeout(() => {
          setUploadState('idle');
          setUploadProgress(0);
        }, 2000);
      } else {
        setUploadState('error');
        setErrorMessage(result.error);
        setPreviewUrl(null);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setUploadState('error');
      setErrorMessage('Failed to upload photo. Please try again.');
      setPreviewUrl(null);
    }
  }, [onUploadSuccess]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDelete = async () => {
    if (!displayUrl) return;

    setUploadState('uploading');
    setErrorMessage('');

    try {
      const result = await deleteProfilePhoto();

      if (result.success) {
        setPreviewUrl(null);
        setUploadState('idle');
        onDeleteSuccess?.();
      } else {
        setUploadState('error');
        setErrorMessage(result.error);
      }
    } catch {
      setUploadState('error');
      setErrorMessage('Failed to delete photo. Please try again.');
    }
  };

  const handleClick = () => {
    if (uploadState !== 'uploading') {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-32 h-32 rounded-full cursor-pointer
          border-2 border-dashed transition-all duration-200
          ${isDragging
            ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10'
            : 'border-[var(--color-border)] hover:border-[var(--league-primary)] hover:bg-[var(--color-surface-hover)]'
          }
          ${uploadState === 'uploading' ? 'pointer-events-none' : ''}
        `}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Content based on state */}
        {displayUrl ? (
          // Show avatar image
          <div className="relative w-full h-full">
            <Image
              src={displayUrl}
              alt="Profile photo"
              fill
              className="rounded-full object-cover"
              unoptimized={displayUrl.startsWith('data:')}
            />

            {/* Overlay on hover */}
            {uploadState === 'idle' && (
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
            )}

            {/* Upload progress overlay */}
            {uploadState === 'uploading' && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin mb-2" />
                <span className="text-xs text-white font-medium">{uploadProgress}%</span>
              </div>
            )}

            {/* Success overlay */}
            {uploadState === 'success' && (
              <div className="absolute inset-0 rounded-full bg-green-500/60 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
        ) : (
          // Show upload prompt
          <div className="flex flex-col items-center justify-center text-center p-4">
            {uploadState === 'uploading' ? (
              <>
                <Loader2 className="w-8 h-8 text-[var(--league-primary)] animate-spin mb-2" />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {uploadProgress}%
                </span>
              </>
            ) : (
              <>
                <User className="w-10 h-10 text-[var(--color-text-muted)] mb-1" />
                <Upload className="w-4 h-4 text-[var(--color-text-muted)]" />
              </>
            )}
          </div>
        )}
      </div>

      {/* Action buttons and status */}
      <div className="flex flex-col items-center gap-2">
        {/* Change/Upload button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={uploadState === 'uploading'}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-lg text-sm font-medium hover:bg-[var(--color-border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadState === 'uploading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {displayUrl ? 'Change Photo' : 'Upload Photo'}
            </>
          )}
        </button>

        {/* Delete button (only show if there's a current photo) */}
        {displayUrl && uploadState !== 'uploading' && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1 text-red-400 text-xs font-medium hover:text-red-300 transition-colors"
          >
            <X className="w-3 h-3" />
            Remove Photo
          </button>
        )}

        {/* File type hint */}
        <p className="text-xs text-[var(--color-text-muted)]">
          JPG, PNG or WebP. Max {MAX_SIZE_MB}MB.
        </p>

        {/* Error message */}
        {uploadState === 'error' && errorMessage && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhotoUpload;
