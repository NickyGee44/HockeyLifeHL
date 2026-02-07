'use client';

import { useCallback } from 'react';
import type { LeagueEditorData } from './types';
import { EditorProvider, useEditor } from './EditorContext';
import { usePreviewMessaging } from './hooks/usePreviewMessaging';
import { useUnsavedChanges } from './hooks/useUnsavedChanges';
import { EditorHeader } from './EditorHeader';
import { EditorSidebar } from './EditorSidebar';
import { EditorPreview } from './EditorPreview';
import { ThemePanel } from './panels/ThemePanel';
import { ImagesPanel } from './panels/ImagesPanel';
import { ContentPanel } from './panels/ContentPanel';
import { NavigationPanel } from './panels/NavigationPanel';
import { SocialLinksPanel } from './panels/SocialLinksPanel';
import { SeoPanel } from './panels/SeoPanel';
import { AdvancedPanel } from './panels/AdvancedPanel';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WebsiteEditorClientProps {
  organizationId: string;
  leagues: LeagueEditorData[];
  previewBaseUrl: string;
}

// ---------------------------------------------------------------------------
// Inner shell -- must live inside EditorProvider to use hooks
// ---------------------------------------------------------------------------

function EditorShell() {
  const { setPreviewReady, iframeRef, previewUrl } = useEditor();

  // Single instantiation of preview messaging (sends theme via postMessage)
  usePreviewMessaging();

  // Beforeunload guard
  useUnsavedChanges();

  // Refresh handler - resets preview readiness and reloads the iframe
  const handleRefreshPreview = useCallback(() => {
    setPreviewReady(false);
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl;
    }
  }, [setPreviewReady, iframeRef, previewUrl]);

  const panels: Record<string, React.ReactNode> = {
    theme: <ThemePanel />,
    images: <ImagesPanel />,
    content: <ContentPanel />,
    navigation: <NavigationPanel />,
    social: <SocialLinksPanel />,
    seo: <SeoPanel />,
    advanced: <AdvancedPanel />,
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <EditorHeader onRefreshPreview={handleRefreshPreview} />

      <div className="flex-1 flex overflow-hidden">
        <EditorSidebar panels={panels} />
        <EditorPreview />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export -- wraps shell in EditorProvider
// ---------------------------------------------------------------------------

export function WebsiteEditorClient({
  organizationId,
  leagues,
  previewBaseUrl,
}: WebsiteEditorClientProps) {
  return (
    <EditorProvider
      organizationId={organizationId}
      leagues={leagues}
      previewBaseUrl={previewBaseUrl}
    >
      <EditorShell />
    </EditorProvider>
  );
}
