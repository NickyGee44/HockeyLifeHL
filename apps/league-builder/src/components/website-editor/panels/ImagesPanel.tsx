'use client';

import { useState, useRef } from 'react';
import { cn } from '@hockey-life/ui';
import { Image as ImageIcon, Layout, Globe, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LogoUploader } from '@/components/ui/logo-uploader';
import { LeagueLogo } from '@/components/ui/league-logo';
import {
  uploadLeagueLogo,
  deleteLeagueLogo,
  uploadLeagueBanner,
  deleteLeagueBanner,
  uploadLeagueFavicon,
  deleteLeagueFavicon,
} from '@/lib/actions/logo';
import { useEditor } from '../EditorContext';

// ---------------------------------------------------------------------------
// ImagesPanel
// ---------------------------------------------------------------------------

export function ImagesPanel() {
  const { state, setField } = useEditor();

  const selectedLeague = state.leagues.find((l) => l.id === state.selectedLeagueId);

  return (
    <div className="space-y-8">
      {/* Logo Section */}
      <LogoSection
        logoUrl={state.logoUrl}
        leagueId={state.selectedLeagueId}
        leagueName={selectedLeague?.name ?? ''}
        primaryColor={state.primaryColor}
        onLogoChange={(url) => {
          setField('logoUrl', url);
        }}
      />

      {/* Banner Section */}
      <BannerSection
        bannerUrl={state.bannerUrl}
        leagueId={state.selectedLeagueId}
        onBannerChange={(url) => {
          setField('bannerUrl', url);
        }}
      />

      {/* Favicon Section */}
      <FaviconSection
        faviconUrl={state.faviconUrl}
        leagueId={state.selectedLeagueId}
        onFaviconChange={(url) => {
          setField('faviconUrl', url);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// LogoSection
// ---------------------------------------------------------------------------

function LogoSection({
  logoUrl,
  leagueId,
  leagueName,
  primaryColor,
  onLogoChange,
}: {
  logoUrl: string | null;
  leagueId: string;
  leagueName: string;
  primaryColor: string;
  onLogoChange: (url: string | null) => void;
}) {
  const t = useTranslations('websiteEditor.images');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-rink-500" />
          {t('logo')}
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          {t('logoSubtitle')}
        </p>
      </div>

      {/* Current logo preview */}
      <div className="flex justify-center">
        <LeagueLogo
          logoUrl={logoUrl}
          leagueName={leagueName}
          primaryColor={primaryColor}
          size="xl"
          shape="square"
          bordered
        />
      </div>

      {/* Logo uploader */}
      <LogoUploader
        value={logoUrl || ''}
        onChange={(url) => {
          onLogoChange(url || null);
        }}
        onUpload={async (file) => {
          const result = await uploadLeagueLogo(leagueId, file);
          if (!result.success) {
            throw new Error(result.error);
          }
          return result.data;
        }}
        onRemove={async () => {
          const result = await deleteLeagueLogo(leagueId);
          if (!result.success) {
            throw new Error(result.error);
          }
        }}
        placeholder="Upload Logo"
        shape="square"
        showDownload={!!logoUrl}
      />

      <div className="pt-3 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-2">Tips</h4>
        <ul className="text-xs text-neutral-500 space-y-1 list-disc list-inside">
          <li>{t('logoTipSquare')}</li>
          <li>{t('logoTipTransparent')}</li>
          <li>{t('logoTipSize')}</li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BannerSection
// ---------------------------------------------------------------------------

function BannerSection({
  bannerUrl,
  leagueId,
  onBannerChange,
}: {
  bannerUrl: string | null;
  leagueId: string;
  onBannerChange: (url: string | null) => void;
}) {
  const t = useTranslations('websiteEditor.images');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadLeagueBanner(leagueId, file);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onBannerChange(result.data.url);
    } catch {
      setError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await deleteLeagueBanner(leagueId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onBannerChange(null);
    } catch {
      setError('Failed to remove banner');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-white/10">
      <div>
        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <Layout className="w-4 h-4 text-rink-500" />
          {t('banner')}
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          {t('bannerSubtitle')}
        </p>
      </div>

      {/* Current banner preview */}
      <div className="relative rounded-lg overflow-hidden bg-neutral-800 border border-white/10">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt="Banner preview"
            className="w-full h-32 object-cover"
          />
        ) : (
          <div className="w-full h-32 flex items-center justify-center">
            <span className="text-neutral-500 text-sm">{t('noBanner')}</span>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Upload/Remove buttons */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
            'bg-rink-500/10 text-rink-400 hover:bg-rink-500/20',
            'disabled:opacity-50'
          )}
        >
          {isUploading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading...
            </span>
          ) : bannerUrl ? (
            t('bannerReplace')
          ) : (
            t('bannerUpload')
          )}
        </button>
        {bannerUrl && (
          <button
            onClick={handleRemove}
            disabled={isUploading}
            className="py-2 px-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            {t('bannerRemove')}
          </button>
        )}
      </div>

      <div className="pt-3 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-2">Tips</h4>
        <ul className="text-xs text-neutral-500 space-y-1 list-disc list-inside">
          <li>{t('bannerTipSize')}</li>
          <li>{t('bannerTipDark')}</li>
          <li>{t('bannerTipMax')}</li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FaviconSection
// ---------------------------------------------------------------------------

function FaviconSection({
  faviconUrl,
  leagueId,
  onFaviconChange,
}: {
  faviconUrl: string | null;
  leagueId: string;
  onFaviconChange: (url: string | null) => void;
}) {
  const t = useTranslations('websiteEditor.images');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadLeagueFavicon(leagueId, file);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onFaviconChange(result.data.url);
    } catch {
      setError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await deleteLeagueFavicon(leagueId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onFaviconChange(null);
    } catch {
      setError('Failed to remove favicon');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-white/10">
      <div>
        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <Globe className="w-4 h-4 text-rink-500" />
          {t('favicon')}
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          {t('faviconSubtitle')}
        </p>
      </div>

      {/* Current favicon preview */}
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-neutral-800 border border-white/10 flex items-center justify-center">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt="Favicon preview"
              className="w-8 h-8 object-contain"
            />
          ) : (
            <Globe className="w-6 h-6 text-neutral-500" />
          )}
        </div>

        {/* Simulated browser tab */}
        {faviconUrl && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 rounded-t-lg border border-white/10 border-b-0">
            <img src={faviconUrl} alt="" className="w-4 h-4 object-contain" />
            <span className="text-xs text-neutral-400 truncate max-w-[100px]">
              Your League
            </span>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Upload/Remove buttons */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/x-icon,image/png,image/svg+xml,image/vnd.microsoft.icon"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
            'bg-rink-500/10 text-rink-400 hover:bg-rink-500/20',
            'disabled:opacity-50'
          )}
        >
          {isUploading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading...
            </span>
          ) : faviconUrl ? (
            t('faviconReplace')
          ) : (
            t('faviconUpload')
          )}
        </button>
        {faviconUrl && (
          <button
            onClick={handleRemove}
            disabled={isUploading}
            className="py-2 px-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            {t('faviconRemove')}
          </button>
        )}
      </div>

      <div className="pt-3 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-2">Tips</h4>
        <ul className="text-xs text-neutral-500 space-y-1 list-disc list-inside">
          <li>Use a 32x32 or 64x64 pixel image</li>
          <li>PNG with transparency is recommended</li>
          <li>ICO files work in all browsers</li>
        </ul>
      </div>
    </div>
  );
}
