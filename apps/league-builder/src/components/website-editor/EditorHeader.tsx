'use client';

import { cn } from '@hockey-life/ui';
import { LeagueLogo } from '@/components/ui/league-logo';
import {
  ArrowLeft,
  Save,
  Loader2,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useEditor } from './EditorContext';
import { useEditorSave } from './hooks/useEditorSave';
import type { ViewportSize } from './types';

interface EditorHeaderProps {
  onRefreshPreview: () => void;
}

export function EditorHeader({ onRefreshPreview }: EditorHeaderProps) {
  const {
    state,
    hasUnsavedChanges,
    switchLeague,
    setViewportSize,
    previewUrl,
  } = useEditor();
  const { save, isSaving } = useEditorSave();

  const selectedLeague = state.leagues.find((l) => l.id === state.selectedLeagueId);
  const dirty = hasUnsavedChanges();

  return (
    <header className="bg-neutral-900 border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <a
          href="/dashboard"
          className="p-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>

        <div className="flex items-center gap-3">
          {selectedLeague && (
            <LeagueLogo
              logoUrl={state.logoUrl}
              leagueName={selectedLeague.name}
              primaryColor={state.primaryColor}
              size="sm"
              shape="square"
            />
          )}
          <div>
            <h1 className="text-lg font-bold text-white">Website Editor</h1>
            {state.leagues.length > 1 ? (
              <select
                value={state.selectedLeagueId}
                onChange={(e) => switchLeague(e.target.value)}
                className="text-sm text-neutral-400 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-white"
              >
                {state.leagues.map((league) => (
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
                  state.viewportSize === size
                    ? 'bg-rink-500/20 text-rink-400'
                    : 'text-neutral-400 hover:text-white',
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
          onClick={onRefreshPreview}
          className="p-2 text-neutral-400 hover:text-white transition-colors"
          title="Refresh preview"
        >
          <RefreshCw className={cn('w-4 h-4', !state.isPreviewReady && 'animate-spin')} />
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
        {dirty && (
          <span className="text-xs text-amber-400 font-medium">Unsaved changes</span>
        )}

        {/* Save Button */}
        <button
          onClick={save}
          disabled={isSaving || !dirty}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm',
            'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
            'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
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
  );
}
