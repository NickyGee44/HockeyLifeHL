'use client';

import { useState, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import { Loader2, PanelLeftClose, PanelLeft, MonitorX, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEditor } from './EditorContext';
import { VIEWPORT_WIDTHS } from './constants';

/** Seconds to wait before showing the "preview unavailable" fallback */
const PREVIEW_TIMEOUT_MS = 8000;

export function EditorPreview() {
  const { state, toggleSidebar, iframeRef, previewUrl, setPreviewReady } = useEditor();
  const t = useTranslations('websiteEditor');
  const [timedOut, setTimedOut] = useState(false);

  // Reset timeout when preview becomes ready or when the URL changes
  useEffect(() => {
    setTimedOut(false);
    if (state.isPreviewReady) return;

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, PREVIEW_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [state.isPreviewReady, previewUrl]);

  const handleRetryPreview = () => {
    setTimedOut(false);
    setPreviewReady(false);
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl;
    }
  };

  const isMobile = state.viewportSize === 'mobile';
  const isTablet = state.viewportSize === 'tablet';
  const isConstrained = isMobile || isTablet;

  return (
    <main className="flex-1 bg-neutral-800 flex flex-col relative min-w-0">
      {/* Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute top-3 left-3 z-20 p-2 rounded-lg transition-all duration-200',
          'bg-neutral-700/80 hover:bg-neutral-700 text-neutral-300 hover:text-white',
          'border border-white/10 hover:border-white/20',
          'shadow-lg backdrop-blur-sm',
        )}
        title={state.isSidebarCollapsed ? t('showPanel') : t('hidePanel')}
      >
        {state.isSidebarCollapsed ? (
          <PanelLeft className="w-5 h-5" />
        ) : (
          <PanelLeftClose className="w-5 h-5" />
        )}
      </button>

      {/* Loading overlay — shows spinner initially, then falls back to helpful message */}
      {!state.isPreviewReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 z-10">
          {timedOut ? (
            <div className="text-center max-w-sm px-4">
              <MonitorX className="w-10 h-10 text-neutral-500 mx-auto mb-4" />
              <h3 className="text-white font-semibold text-lg mb-2">
                {t('previewUnavailable')}
              </h3>
              <p className="text-neutral-400 text-sm mb-4">
                {t('previewUnavailableDescription')}
              </p>
              <div className="bg-neutral-800 rounded-lg p-3 mb-4 border border-white/10">
                <code className="text-rink-400 text-sm font-mono">pnpm dev:website</code>
              </div>
              <button
                onClick={handleRetryPreview}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-rink-500/20 text-rink-400 hover:bg-rink-500/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('retryPreview')}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-rink-500 animate-spin mx-auto mb-3" />
              <p className="text-neutral-400">{t('loadingPreview')}</p>
            </div>
          )}
        </div>
      )}

      {/* Preview frame — fills all available space in desktop mode,
          centered with device chrome in tablet/mobile */}
      {isConstrained ? (
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <div
            className={cn(
              'bg-white shadow-2xl overflow-hidden transition-all duration-300 shrink-0',
              isMobile && 'rounded-[2rem] border-8 border-neutral-700',
              isTablet && 'rounded-xl border-4 border-neutral-700',
            )}
            style={{
              width: VIEWPORT_WIDTHS[state.viewportSize],
              height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 100px)',
              maxWidth: '100%',
            }}
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              title={t('previewTitle')}
            />
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="flex-1 w-full border-0 bg-white"
          title={t('previewTitle')}
        />
      )}
    </main>
  );
}
