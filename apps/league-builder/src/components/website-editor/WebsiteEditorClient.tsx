'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { updateLeagueBranding } from '@/lib/actions/organization';
import { uploadLeagueLogo, deleteLeagueLogo } from '@/lib/actions/logo';
import { LogoUploader } from '@/components/ui/logo-uploader';
import { LeagueLogo } from '@/components/ui/league-logo';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  ExternalLink,
  Eye,
  Palette,
  Image as ImageIcon,
  Type,
  Layout,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

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

interface WebsiteEditorClientProps {
  organizationId: string;
  leagues: League[];
  previewBaseUrl: string;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type EditorPanel = 'colors' | 'logo' | 'sections' | 'content';

const VIEWPORT_WIDTHS: Record<ViewportSize, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

export function WebsiteEditorClient({
  organizationId,
  leagues,
  previewBaseUrl,
}: WebsiteEditorClientProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // League selection
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(leagues[0]?.id || '');
  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId);

  // Editor state
  const [activePanel, setActivePanel] = useState<EditorPanel>('colors');
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Branding state (editable)
  const [primaryColor, setPrimaryColor] = useState(selectedLeague?.primary_color || '#1E40AF');
  const [secondaryColor, setSecondaryColor] = useState(selectedLeague?.secondary_color || '#3B82F6');
  const [accentColor, setAccentColor] = useState(selectedLeague?.accent_color || '#FFD700');
  const [logoUrl, setLogoUrl] = useState<string | null>(selectedLeague?.logo_url || null);

  // Preview URL
  const previewUrl = selectedLeague
    ? `${previewBaseUrl}/${selectedLeague.slug}?preview=true`
    : '';

  // Listen for preview ready message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PREVIEW_READY') {
        setIsPreviewReady(true);
        // Send initial theme
        sendThemeUpdate();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send theme update to preview iframe
  const sendThemeUpdate = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage(
      {
        type: 'PREVIEW_THEME_UPDATE',
        payload: {
          primaryColor,
          secondaryColor,
          accentColor,
          logoUrl,
        },
      },
      '*'
    );
  }, [primaryColor, secondaryColor, accentColor, logoUrl]);

  // Update preview when colors change
  useEffect(() => {
    if (isPreviewReady) {
      sendThemeUpdate();
      setHasUnsavedChanges(true);
    }
  }, [primaryColor, secondaryColor, accentColor, logoUrl, isPreviewReady, sendThemeUpdate]);

  // Update state when league changes
  const handleLeagueChange = (leagueId: string) => {
    const league = leagues.find((l) => l.id === leagueId);
    if (league) {
      setSelectedLeagueId(leagueId);
      setPrimaryColor(league.primary_color || '#1E40AF');
      setSecondaryColor(league.secondary_color || '#3B82F6');
      setAccentColor(league.accent_color || '#FFD700');
      setLogoUrl(league.logo_url);
      setError(null);
      setSuccess(null);
      setIsPreviewReady(false);
      setHasUnsavedChanges(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedLeagueId) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateLeagueBranding({
        leagueId: selectedLeagueId,
        primaryColor,
        secondaryColor,
        accentColor,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Changes saved successfully!');
        setHasUnsavedChanges(false);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Refresh preview
  const handleRefreshPreview = () => {
    setIsPreviewReady(false);
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Editor Header */}
      <header className="bg-neutral-900 border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <a
            href="/dashboard/settings"
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>

          <div className="flex items-center gap-3">
            {selectedLeague && (
              <LeagueLogo
                logoUrl={logoUrl}
                leagueName={selectedLeague.name}
                primaryColor={primaryColor}
                size="sm"
                shape="square"
              />
            )}
            <div>
              <h1 className="text-lg font-bold text-white">Website Editor</h1>
              {leagues.length > 1 ? (
                <select
                  value={selectedLeagueId}
                  onChange={(e) => handleLeagueChange(e.target.value)}
                  className="text-sm text-neutral-400 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-white"
                >
                  {leagues.map((league) => (
                    <option key={league.id} value={league.id} className="bg-neutral-900">
                      {league.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-neutral-400">{selectedLeague?.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Viewport Size Controls */}
          <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
            {(['desktop', 'tablet', 'mobile'] as ViewportSize[]).map((size) => {
              const Icon = size === 'desktop' ? Monitor : size === 'tablet' ? Tablet : Smartphone;
              return (
                <button
                  key={size}
                  onClick={() => setViewportSize(size)}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewportSize === size
                      ? 'bg-rink-500/20 text-rink-400'
                      : 'text-neutral-400 hover:text-white'
                  )}
                  title={`${size.charAt(0).toUpperCase() + size.slice(1)} view`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Refresh Preview */}
          <button
            onClick={handleRefreshPreview}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className={cn('w-4 h-4', !isPreviewReady && 'animate-spin')} />
          </button>

          {/* Open in new tab */}
          <a
            href={previewUrl.replace('?preview=true', '')}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            title="Open website in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-400 font-medium">Unsaved changes</span>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm',
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
                Save Changes
              </>
            )}
          </button>
        </div>
      </header>

      {/* Success/Error Messages */}
      {(success || error) && (
        <div className="px-4 py-2 bg-neutral-900 border-b border-white/10">
          {success && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Editor Panels */}
        <aside
          className={cn(
            'bg-neutral-900 border-r border-white/10 flex flex-col overflow-hidden transition-all duration-300 ease-in-out',
            isSidebarCollapsed ? 'w-0 border-r-0' : 'w-[280px]'
          )}
        >
          {/* Panel Tabs */}
          <div className={cn('flex border-b border-white/10', isSidebarCollapsed && 'hidden')}>
            {[
              { id: 'colors' as EditorPanel, icon: Palette, label: 'Colors' },
              { id: 'logo' as EditorPanel, icon: ImageIcon, label: 'Logo' },
              { id: 'sections' as EditorPanel, icon: Layout, label: 'Sections' },
              { id: 'content' as EditorPanel, icon: Type, label: 'Content' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActivePanel(id)}
                className={cn(
                  'flex-1 py-3 text-xs font-medium transition-colors flex flex-col items-center gap-1',
                  activePanel === id
                    ? 'bg-rink-500/10 text-rink-400 border-b-2 border-rink-500'
                    : 'text-neutral-400 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className={cn('flex-1 overflow-auto p-4', isSidebarCollapsed && 'hidden')}>
            {activePanel === 'colors' && (
              <ColorPanel
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                accentColor={accentColor}
                onPrimaryChange={setPrimaryColor}
                onSecondaryChange={setSecondaryColor}
                onAccentChange={setAccentColor}
              />
            )}

            {activePanel === 'logo' && (
              <LogoPanel
                logoUrl={logoUrl}
                leagueId={selectedLeagueId}
                leagueName={selectedLeague?.name || ''}
                primaryColor={primaryColor}
                onLogoChange={(url) => {
                  setLogoUrl(url);
                  setHasUnsavedChanges(true);
                }}
              />
            )}

            {activePanel === 'sections' && (
              <div className="text-center py-12">
                <Layout className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-neutral-400 font-medium mb-1">Section Management</h3>
                <p className="text-sm text-neutral-500">
                  Coming in Phase 2 - Show/hide and reorder homepage sections
                </p>
              </div>
            )}

            {activePanel === 'content' && (
              <div className="text-center py-12">
                <Type className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-neutral-400 font-medium mb-1">Content Editor</h3>
                <p className="text-sm text-neutral-500">
                  Coming in Phase 3 - Edit hero text, about page, and more
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Preview Area */}
        <main className="flex-1 bg-neutral-800 flex items-center justify-center p-8 overflow-auto relative">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              'absolute top-4 left-4 z-20 p-2 rounded-lg transition-all duration-200',
              'bg-neutral-700/80 hover:bg-neutral-700 text-neutral-300 hover:text-white',
              'border border-white/10 hover:border-white/20',
              'shadow-lg backdrop-blur-sm'
            )}
            title={isSidebarCollapsed ? 'Show editor panel' : 'Hide editor panel'}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
          <div
            className={cn(
              'bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300',
              viewportSize === 'mobile' && 'rounded-[2rem] border-8 border-neutral-700'
            )}
            style={{
              width: VIEWPORT_WIDTHS[viewportSize],
              height: viewportSize === 'mobile' ? 'calc(100vh - 200px)' : 'calc(100vh - 150px)',
              maxWidth: '100%',
            }}
          >
            {!isPreviewReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 z-10">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-rink-500 animate-spin mx-auto mb-3" />
                  <p className="text-neutral-400">Loading preview...</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              title="Website Preview"
            />
          </div>
        </main>
      </div>
    </div>
  );
}

// Color Panel Component
function ColorPanel({
  primaryColor,
  secondaryColor,
  accentColor,
  onPrimaryChange,
  onSecondaryChange,
  onAccentChange,
}: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
  onAccentChange: (color: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4 text-rink-500" />
          Brand Colors
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          Changes appear instantly in the preview. Click Save to publish.
        </p>
      </div>

      {/* Primary Color */}
      <ColorInput
        label="Primary Color"
        description="Main brand color, used for buttons and links"
        value={primaryColor}
        onChange={onPrimaryChange}
      />

      {/* Secondary Color */}
      <ColorInput
        label="Secondary Color"
        description="Complementary color for accents and gradients"
        value={secondaryColor}
        onChange={onSecondaryChange}
      />

      {/* Accent Color */}
      <ColorInput
        label="Accent Color"
        description="Highlight color for badges and notifications"
        value={accentColor}
        onChange={onAccentChange}
      />

      {/* Color Presets */}
      <div className="pt-4 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-3">Quick Presets</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'Classic Blue', primary: '#1E40AF', secondary: '#3B82F6', accent: '#FFD700' },
            { name: 'Forest Green', primary: '#166534', secondary: '#22C55E', accent: '#FCD34D' },
            { name: 'Bold Red', primary: '#B91C1C', secondary: '#EF4444', accent: '#FDE68A' },
            { name: 'Royal Purple', primary: '#7E22CE', secondary: '#A855F7', accent: '#F9A8D4' },
            { name: 'Sunset Orange', primary: '#C2410C', secondary: '#F97316', accent: '#FEF08A' },
            { name: 'Midnight', primary: '#1F2937', secondary: '#4B5563', accent: '#22D3EE' },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                onPrimaryChange(preset.primary);
                onSecondaryChange(preset.secondary);
                onAccentChange(preset.accent);
              }}
              className="group p-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex gap-1 mb-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.primary }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.secondary }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }} />
              </div>
              <span className="text-[10px] text-neutral-500 group-hover:text-neutral-300">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Color Input Component
function ColorInput({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1">{label}</label>
      <p className="text-xs text-neutral-500 mb-2">{description}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg font-mono text-sm text-neutral-300 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20"
          placeholder="#000000"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// Logo Panel Component
function LogoPanel({
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
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-rink-500" />
          League Logo
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          Upload your league logo. Supports PNG, JPG, WebP up to 5MB.
        </p>
      </div>

      {/* Current Logo Preview */}
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

      {/* Logo Uploader */}
      <LogoUploader
        value={logoUrl || ''}
        onChange={(url) => {
          onLogoChange(url || null);
          router.refresh();
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

      <div className="pt-4 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-2">Tips</h4>
        <ul className="text-xs text-neutral-500 space-y-1 list-disc list-inside">
          <li>Use a square logo for best results</li>
          <li>Transparent backgrounds work best</li>
          <li>Minimum recommended size: 256x256px</li>
        </ul>
      </div>
    </div>
  );
}
