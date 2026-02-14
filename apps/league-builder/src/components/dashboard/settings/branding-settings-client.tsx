'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hockey-life/ui';
import { updateLeagueBranding } from '@/lib/actions/organization';
import { uploadLeagueLogo, deleteLeagueLogo } from '@/lib/actions/logo';
import { LogoUploader } from '@/components/ui/logo-uploader';
import { LeagueLogo } from '@/components/ui/league-logo';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trophy } from 'lucide-react';

interface League {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  status: string | null;
}

interface BrandingSettingsClientProps {
  leagues: League[];
}

export function BrandingSettingsClient({ leagues }: BrandingSettingsClientProps) {
  const router = useRouter();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(
    leagues.length > 0 ? leagues[0].id : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for the selected league
  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId);
  const [primaryColor, setPrimaryColor] = useState(selectedLeague?.primary_color || '#1E40AF');
  const [secondaryColor, setSecondaryColor] = useState(selectedLeague?.secondary_color || '#3B82F6');
  const [accentColor, setAccentColor] = useState(selectedLeague?.accent_color || '#FFD700');
  const [logoPreview, setLogoPreview] = useState<string | null>(selectedLeague?.logo_url || null);

  // Update form when league selection changes
  const handleLeagueChange = (leagueId: string) => {
    const league = leagues.find((l) => l.id === leagueId);
    if (league) {
      setSelectedLeagueId(leagueId);
      setPrimaryColor(league.primary_color || '#1E40AF');
      setSecondaryColor(league.secondary_color || '#3B82F6');
      setAccentColor(league.accent_color || '#FFD700');
      setLogoPreview(league.logo_url);
      setError(null);
      setSuccess(null);
    }
  };

  const handleSaveColors = async () => {
    if (!selectedLeagueId) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateLeagueBranding({
        leagueId: selectedLeagueId,
        primaryColor,
        secondaryColor,
        accentColor });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Branding colors saved successfully');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (leagues.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-neutral-800/50 border-white/10">
          <CardContent className="py-12 text-center">
            <Trophy className="w-16 h-16 text-rink-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Leagues Yet</h3>
            <p className="text-neutral-400 mb-4">
              Create a league first to customize its branding
            </p>
            <a
              href="/dashboard/leagues/new"
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              Create Your First League
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* League Selector */}
      {leagues.length > 1 && (
        <Card className="bg-neutral-800/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-neutral-100">Select League</CardTitle>
            <CardDescription className="text-neutral-400">
              Choose which league to customize
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={selectedLeagueId || ''}
              onChange={(e) => handleLeagueChange(e.target.value)}
              className={cn(
                'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
                'text-sm text-white focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20'
              )}
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Logo Upload */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100">League Logo</CardTitle>
          <CardDescription className="text-neutral-400">
            Upload your league&apos;s logo for branding. Supports crop and resize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploader
            value={logoPreview || ''}
            onChange={(url) => {
              setLogoPreview(url || null);
              if (!url) {
                setSuccess('Logo removed successfully');
              } else {
                setSuccess('Logo uploaded successfully');
              }
              router.refresh();
            }}
            onUpload={async (file) => {
              if (!selectedLeagueId) {
                throw new Error('No league selected');
              }
              const result = await uploadLeagueLogo(selectedLeagueId, file);
              if (!result.success) {
                throw new Error(result.error);
              }
              return result.data;
            }}
            onRemove={async () => {
              if (!selectedLeagueId) {
                throw new Error('No league selected');
              }
              const result = await deleteLeagueLogo(selectedLeagueId);
              if (!result.success) {
                throw new Error(result.error);
              }
            }}
            placeholder="Upload Logo"
            shape="square"
            showDownload={!!logoPreview}
          />
        </CardContent>
      </Card>

      {/* Color Scheme */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100">Color Scheme</CardTitle>
          <CardDescription className="text-neutral-400">
            Customize your league&apos;s brand colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer bg-neutral-900 border border-neutral-700"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2 bg-black/50 border border-rink-500/30 rounded-xl font-mono text-sm text-neutral-300"
                  placeholder="#1E40AF"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer bg-neutral-900 border border-neutral-700"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-4 py-2 bg-black/50 border border-rink-500/30 rounded-xl font-mono text-sm text-neutral-300"
                  placeholder="#3B82F6"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer bg-neutral-900 border border-neutral-700"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 px-4 py-2 bg-black/50 border border-rink-500/30 rounded-xl font-mono text-sm text-neutral-300"
                  placeholder="#FFD700"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-neutral-800">
            <button
              onClick={handleSaveColors}
              disabled={isSaving}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Colors
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100">Brand Preview</CardTitle>
          <CardDescription className="text-neutral-400">
            See how your branding will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-white/10 rounded-xl p-6 bg-neutral-900/50">
            <div className="flex items-center gap-4 mb-6">
              <LeagueLogo
                logoUrl={logoPreview}
                leagueName={selectedLeague?.name || 'Your League'}
                primaryColor={primaryColor}
                size="lg"
                shape="square"
                bordered
              />
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedLeague?.name || 'Your League'}
                </h3>
                <p className="text-sm text-neutral-400">Sample league header</p>
              </div>
            </div>

            {/* Sample UI Elements */}
            <div className="grid grid-cols-3 gap-4">
              <div
                className="p-4 rounded-xl text-white text-center font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                Primary
              </div>
              <div
                className="p-4 rounded-xl text-white text-center font-medium"
                style={{ backgroundColor: secondaryColor }}
              >
                Secondary
              </div>
              <div
                className="p-4 rounded-xl text-black text-center font-medium"
                style={{ backgroundColor: accentColor }}
              >
                Accent
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-xl text-sm font-medium border-2"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                Outline Button
              </button>
              <span
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${accentColor}30`, color: accentColor }}
              >
                Badge
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
