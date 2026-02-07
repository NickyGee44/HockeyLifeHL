'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { createClient } from '@/lib/supabase/client';
import { PhotoUpload } from '@/components/profile/PhotoUpload';
import {
  User,
  Mail,
  Phone,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

interface ProfilePageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { leagueSlug } = use(params);
  const { user } = useUser();
  const { profile, isLoading: profileLoading, refetch } = usePlayerProfile();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setSaveStatus('success');
      refetch();

      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setErrorMessage(error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/${leagueSlug}/me`}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Edit Profile</h1>
          <p className="text-[var(--color-text-secondary)]">
            Update your personal information
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* Avatar Section */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Profile Photo
          </h2>
          <div className="flex items-start gap-6">
            <PhotoUpload
              currentPhotoUrl={profile?.avatar_url ?? null}
              onUploadSuccess={() => {
                // Refetch profile to update the avatar URL across the app
                refetch();
              }}
              onDeleteSuccess={() => {
                // Refetch profile to clear the avatar URL
                refetch();
              }}
            />
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Personal Information
            </h2>

            <div className="space-y-4">
              {/* Full Name Field */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Email (Read Only) */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Email cannot be changed here. Contact support if needed.
                </p>
              </div>

              {/* Phone (Optional) */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
                >
                  Phone Number
                  <span className="text-[var(--color-text-muted)] font-normal ml-1">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {saveStatus === 'success' && (
              <div className="mt-4 flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Profile saved successfully
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errorMessage || 'Failed to save profile'}
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-[var(--league-primary)] text-[var(--color-accent-text)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="mt-6 bg-red-500/5 border border-red-500/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            type="button"
            className="px-4 py-2 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
