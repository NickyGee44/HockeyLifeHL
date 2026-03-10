export type ViewportSize = 'desktop' | 'tablet' | 'mobile';
export type ThemePreset = 'dark' | 'light' | 'custom';

export type EditorPanel =
  | 'theme'
  | 'images'
  | 'content'
  | 'navigation'
  | 'social'
  | 'seo'
  | 'advanced';

export interface LeagueEditorData {
  id: string;
  organization_id?: string | null;
  name: string;
  slug: string;
  subdomain?: string | null;
  logo_url: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  tagline: string | null;
  description: string | null;
  status: string | null;
  font_family: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  custom_css: string | null;
  is_public: boolean | null;
  settings: Record<string, unknown> | null;
}

export interface WebsiteSettings {
  themePreset?: ThemePreset;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  socialTiktok?: string;
  visiblePages?: Record<string, boolean>;
  navItems?: Array<{
    label: string;
    href: string;
    isExternal?: boolean;
    isCustomPage?: boolean;
    pageSlug?: string;
  }>;
  showGameTicker?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface EditorState {
  // League selection
  selectedLeagueId: string;
  leagues: LeagueEditorData[];

  // Theme
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themePreset: ThemePreset;
  fontFamily: string;

  // Images
  logoUrl: string | null;
  bannerUrl: string | null;
  faviconUrl: string | null;

  // Content
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;

  // Navigation
  visiblePages: Record<string, boolean>;
  navItems: Array<{
    label: string;
    href: string;
    isExternal?: boolean;
    isCustomPage?: boolean;
    pageSlug?: string;
  }>;
  showGameTicker: boolean;

  // Social
  socialFacebook: string;
  socialTwitter: string;
  socialInstagram: string;
  socialYoutube: string;
  socialTiktok: string;

  // SEO
  seoTitle: string;
  seoDescription: string;

  // Advanced
  customCss: string;
  isPublic: boolean;

  // UI state
  activePanel: EditorPanel;
  viewportSize: ViewportSize;
  isSidebarCollapsed: boolean;
  isSaving: boolean;
  isPreviewReady: boolean;
}

/**
 * Canonical payload sent from the editor to the preview iframe via postMessage.
 * Every field the editor can change MUST be represented here so the preview can
 * deterministically replace its entire state on each message.
 *
 * This is also the shape persisted by useEditorSave (mapped to DB columns).
 */
export interface PreviewThemePayload {
  /** Monotonically increasing counter to let the receiver discard stale messages */
  version: number;

  // Theme
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themePreset: ThemePreset;
  fontFamily: string;

  // Images
  logoUrl: string | null;
  bannerUrl: string | null;
  faviconUrl: string | null;

  // Content
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;

  // Navigation
  visiblePages: Record<string, boolean>;
  navItems: Array<{
    label: string;
    href: string;
    isExternal?: boolean;
    isCustomPage?: boolean;
    pageSlug?: string;
  }>;
  showGameTicker: boolean;

  // Social
  socialFacebook: string;
  socialTwitter: string;
  socialInstagram: string;
  socialYoutube: string;
  socialTiktok: string;

  // SEO
  seoTitle: string;
  seoDescription: string;

  // Advanced
  customCss: string;
  isPublic: boolean;
}
