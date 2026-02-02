'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Camera, Info } from 'lucide-react';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { cn } from '@hockey-life/ui/lib/utils';
import { uploadPlayerPhoto, deletePlayerPhoto } from '@/lib/actions/player-registration';
import type { RegistrationFormData } from '@/lib/schemas/player-registration';

export function Step4PhotoUpload() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<RegistrationFormData>();

  const photoUrl = watch('photo_url');

  const handleUpload = async (file: File) => {
    const result = await uploadPlayerPhoto(file);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data!;
  };

  const handleRemove = async (path: string) => {
    const result = await deletePlayerPhoto(path);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Profile Photo
        </h2>
        <p className="text-neutral-400">
          Upload a photo for your player profile (optional but recommended)
        </p>
      </div>

      {/* Photo Upload Section */}
      <div className="flex flex-col items-center p-8 rounded-xl border border-neutral-700 bg-neutral-800/30">
        <div className="flex items-center gap-2 text-white mb-6">
          <Camera className="w-5 h-5 text-gold-500" />
          <h3 className="font-semibold">Your Photo</h3>
        </div>

        <PhotoUploader
          value={photoUrl}
          onChange={(url) => setValue('photo_url', url, { shouldValidate: true })}
          onUpload={handleUpload}
          onRemove={handleRemove}
          maxSizeBytes={5 * 1024 * 1024} // 5MB
          acceptedTypes={['image/png', 'image/jpeg', 'image/webp']}
          aspectRatio={1}
        />

        {errors.photo_url && (
          <p className="text-sm text-red-400 mt-4">
            {errors.photo_url.message}
          </p>
        )}
      </div>

      {/* Guidelines */}
      <div className="p-4 rounded-lg border border-neutral-700 bg-neutral-800/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-white mb-2">Photo Guidelines</h4>
            <ul className="text-sm text-neutral-400 space-y-1">
              <li>A clear headshot or upper body photo works best</li>
              <li>Make sure your face is clearly visible</li>
              <li>Photos of you in hockey gear are great!</li>
              <li>Max file size: 5MB (PNG, JPG, or WebP)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Why it matters */}
      <div className="p-4 rounded-lg border border-gold-500/30 bg-gold-500/5">
        <h4 className="font-medium text-gold-400 mb-2">Why add a photo?</h4>
        <p className="text-sm text-neutral-300">
          Your photo appears on team rosters, game sheets, and your public profile.
          It helps teammates and captains identify you, and makes the league
          experience more personal. You can always add or change it later.
        </p>
      </div>

      {/* Skip note */}
      <p className="text-sm text-neutral-500 text-center">
        Don't have a photo handy? You can skip this step and add one later from
        your profile settings.
      </p>
    </div>
  );
}
