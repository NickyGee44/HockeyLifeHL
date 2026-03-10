'use client';

import type { LeagueEditorData } from './types';
import { EditorProvider, useEditor } from './EditorContext';
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
  initialLeagueId?: string;
}

// ---------------------------------------------------------------------------
// Inner shell -- must live inside EditorProvider to use hooks
// ---------------------------------------------------------------------------

function EditorShell() {
  const { state } = useEditor();

  // Beforeunload guard
  useUnsavedChanges();

  const panels: Record<string, React.ReactNode> = {
    theme: <ThemePanel />,
    images: <ImagesPanel />,
    content: <ContentPanel />,
    navigation: <NavigationPanel leagueId={state.selectedLeagueId} />,
    social: <SocialLinksPanel />,
    seo: <SeoPanel />,
    advanced: <AdvancedPanel />,
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <EditorHeader />

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
  initialLeagueId,
}: WebsiteEditorClientProps) {
  return (
    <EditorProvider
      organizationId={organizationId}
      leagues={leagues}
      previewBaseUrl={previewBaseUrl}
      initialLeagueId={initialLeagueId}
    >
      <EditorShell />
    </EditorProvider>
  );
}
