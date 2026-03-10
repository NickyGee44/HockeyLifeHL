'use client';

import { createContext, useContext, useReducer, useCallback, useRef, type ReactNode } from 'react';
import type { EditorState, EditorPanel, ViewportSize, LeagueEditorData, WebsiteSettings } from './types';
import { DEFAULT_COLORS, DEFAULT_VISIBLE_PAGES } from './constants';
import { buildWebsiteEditorPreviewUrl } from '@/lib/website-editor/preview';

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type EditorAction =
  | { type: 'SET_FIELD'; field: string; value: unknown }
  | { type: 'SWITCH_LEAGUE'; leagueId: string; leagues: LeagueEditorData[] }
  | { type: 'SET_ACTIVE_PANEL'; panel: EditorPanel }
  | { type: 'SET_VIEWPORT'; size: ViewportSize }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_PREVIEW_READY'; value: boolean }
  | { type: 'MARK_CLEAN' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractWebsiteSettings(settings: Record<string, unknown> | null): WebsiteSettings {
  if (!settings) return {};
  const website = (settings.website ?? {}) as WebsiteSettings;
  return website;
}

function leagueToState(league: LeagueEditorData | undefined, leagues: LeagueEditorData[]): EditorState {
  const ws = extractWebsiteSettings(league?.settings ?? null);
  return {
    selectedLeagueId: league?.id ?? '',
    leagues,
    primaryColor: league?.primary_color ?? DEFAULT_COLORS.primary,
    secondaryColor: league?.secondary_color ?? DEFAULT_COLORS.secondary,
    accentColor: league?.accent_color ?? DEFAULT_COLORS.accent,
    themePreset: ws.themePreset === 'light' || ws.themePreset === 'custom' ? ws.themePreset : 'dark',
    fontFamily: league?.font_family ?? 'Inter',
    logoUrl: league?.logo_url ?? null,
    bannerUrl: league?.banner_url ?? null,
    faviconUrl: league?.favicon_url ?? null,
    tagline: league?.tagline ?? '',
    description: league?.description ?? '',
    contactEmail: league?.contact_email ?? '',
    contactPhone: league?.contact_phone ?? '',
    websiteUrl: league?.website_url ?? '',
    visiblePages: ws.visiblePages ?? { ...DEFAULT_VISIBLE_PAGES },
    navItems: ws.navItems ?? [],
    showGameTicker: ws.showGameTicker ?? false,
    socialFacebook: ws.socialFacebook ?? '',
    socialTwitter: ws.socialTwitter ?? '',
    socialInstagram: ws.socialInstagram ?? '',
    socialYoutube: ws.socialYoutube ?? '',
    socialTiktok: ws.socialTiktok ?? '',
    seoTitle: ws.seoTitle ?? '',
    seoDescription: ws.seoDescription ?? '',
    customCss: league?.custom_css ?? '',
    isPublic: league?.is_public ?? true,
    activePanel: 'theme',
    viewportSize: 'desktop',
    isSidebarCollapsed: false,
    isSaving: false,
    isPreviewReady: false,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SWITCH_LEAGUE': {
      const league = action.leagues.find((l) => l.id === action.leagueId);
      return {
        ...leagueToState(league, action.leagues),
        activePanel: state.activePanel,
        viewportSize: state.viewportSize,
        isSidebarCollapsed: state.isSidebarCollapsed,
      };
    }
    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.panel };
    case 'SET_VIEWPORT':
      return { ...state, viewportSize: action.size };
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed };
    case 'SET_SAVING':
      return { ...state, isSaving: action.value };
    case 'SET_PREVIEW_READY':
      return { ...state, isPreviewReady: action.value };
    case 'MARK_CLEAN':
      return state; // snapshot updated externally
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface EditorContextValue {
  state: EditorState;
  snapshot: React.RefObject<EditorState | null>;
  hasUnsavedChanges: () => boolean;
  setField: (field: string, value: unknown) => void;
  switchLeague: (leagueId: string) => void;
  setActivePanel: (panel: EditorPanel) => void;
  setViewportSize: (size: ViewportSize) => void;
  toggleSidebar: () => void;
  setSaving: (v: boolean) => void;
  setPreviewReady: (v: boolean) => void;
  markClean: () => void;
  organizationId: string;
  previewBaseUrl: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  previewUrl: string;
}

const EditorCtx = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorCtx);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface EditorProviderProps {
  children: ReactNode;
  organizationId: string;
  leagues: LeagueEditorData[];
  previewBaseUrl: string;
  initialLeagueId?: string;
}

export function EditorProvider({ children, organizationId, leagues, previewBaseUrl, initialLeagueId }: EditorProviderProps) {
  const initialLeague = (initialLeagueId && leagues.find((l) => l.id === initialLeagueId)) || leagues[0];
  const initial = leagueToState(initialLeague, leagues);
  const [state, dispatch] = useReducer(editorReducer, initial);
  const snapshot = useRef<EditorState | null>(initial);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const hasUnsavedChanges = useCallback(() => {
    if (!snapshot.current) return false;
    const s = snapshot.current;
    return (
      state.primaryColor !== s.primaryColor ||
      state.secondaryColor !== s.secondaryColor ||
      state.accentColor !== s.accentColor ||
      state.themePreset !== s.themePreset ||
      state.fontFamily !== s.fontFamily ||
      state.logoUrl !== s.logoUrl ||
      state.bannerUrl !== s.bannerUrl ||
      state.faviconUrl !== s.faviconUrl ||
      state.tagline !== s.tagline ||
      state.description !== s.description ||
      state.contactEmail !== s.contactEmail ||
      state.contactPhone !== s.contactPhone ||
      state.websiteUrl !== s.websiteUrl ||
      state.customCss !== s.customCss ||
      state.isPublic !== s.isPublic ||
      state.seoTitle !== s.seoTitle ||
      state.seoDescription !== s.seoDescription ||
      state.socialFacebook !== s.socialFacebook ||
      state.socialTwitter !== s.socialTwitter ||
      state.socialInstagram !== s.socialInstagram ||
      state.socialYoutube !== s.socialYoutube ||
      state.socialTiktok !== s.socialTiktok ||
      state.showGameTicker !== s.showGameTicker ||
      JSON.stringify(state.navItems) !== JSON.stringify(s.navItems) ||
      JSON.stringify(state.visiblePages) !== JSON.stringify(s.visiblePages)
    );
  }, [state]);

  const setField = useCallback((field: string, value: unknown) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const switchLeague = useCallback(
    (leagueId: string) => {
      dispatch({ type: 'SWITCH_LEAGUE', leagueId, leagues });
      const league = leagues.find((l) => l.id === leagueId);
      snapshot.current = leagueToState(league, leagues);
    },
    [leagues],
  );

  const setActivePanel = useCallback((panel: EditorPanel) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', panel });
  }, []);

  const setViewportSize = useCallback((size: ViewportSize) => {
    dispatch({ type: 'SET_VIEWPORT', size });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setSaving = useCallback((v: boolean) => {
    dispatch({ type: 'SET_SAVING', value: v });
  }, []);

  const setPreviewReady = useCallback((v: boolean) => {
    dispatch({ type: 'SET_PREVIEW_READY', value: v });
  }, []);

  const markClean = useCallback(() => {
    snapshot.current = { ...state };
  }, [state]);

  const selectedLeague = state.leagues.find((l) => l.id === state.selectedLeagueId);
  const previewUrl = selectedLeague
    ? buildWebsiteEditorPreviewUrl(previewBaseUrl, selectedLeague.subdomain || selectedLeague.slug)
    : '';

  return (
    <EditorCtx.Provider
      value={{
        state,
        snapshot,
        hasUnsavedChanges,
        setField,
        switchLeague,
        setActivePanel,
        setViewportSize,
        toggleSidebar,
        setSaving,
        setPreviewReady,
        markClean,
        organizationId,
        previewBaseUrl,
        iframeRef,
        previewUrl,
      }}
    >
      {children}
    </EditorCtx.Provider>
  );
}
