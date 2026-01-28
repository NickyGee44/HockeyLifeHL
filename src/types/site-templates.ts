/**
 * Site Templates Type Definitions
 *
 * TypeScript interfaces for the site template system that allows leagues
 * to select and customize their league site design during signup.
 *
 * @module types/site-templates
 * @since 2026-01-28
 * @agent Agent 3
 * @task 1.3 from ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md
 */

// ==============================================================================
// COLOR TYPES
// ==============================================================================

/**
 * Individual color preset with name and color values
 */
export interface ColorPreset {
  /** Display name of the color preset (e.g., "Hockey Red", "Ice Blue") */
  name: string;

  /** Primary brand color (hex format: #RRGGBB) */
  primary: string;

  /** Secondary brand color (hex format: #RRGGBB) */
  secondary: string;

  /** Accent color for highlights (hex format: #RRGGBB) */
  accent: string;

  /** Optional text color for light backgrounds */
  textLight?: string;

  /** Optional text color for dark backgrounds */
  textDark?: string;
}

/**
 * Color customization object used in league_template_settings
 */
export interface ColorCustomization {
  /** Custom primary color (overrides preset) */
  primary?: string | null;

  /** Custom secondary color (overrides preset) */
  secondary?: string | null;

  /** Custom accent color (overrides preset) */
  accent?: string | null;

  /** Custom text color for light backgrounds */
  textLight?: string | null;

  /** Custom text color for dark backgrounds */
  textDark?: string | null;
}

// ==============================================================================
// LAYOUT TYPES
// ==============================================================================

/**
 * Header style variants
 */
export type HeaderStyle = 'classic' | 'modern' | 'minimal' | 'bold' | 'compact';

/**
 * Card style variants
 */
export type CardStyle = 'elevated' | 'flat' | 'bordered' | 'shadow' | 'glass';

/**
 * Spacing scale
 */
export type SpacingScale = 'compact' | 'normal' | 'relaxed' | 'spacious';

/**
 * Typography style
 */
export type TypographyStyle = 'sport' | 'modern' | 'classic' | 'bold' | 'minimal';

/**
 * Layout configuration for a template
 */
export interface LayoutConfig {
  /** Header/navigation style */
  headerStyle: HeaderStyle;

  /** Card component style */
  cardStyle: CardStyle;

  /** Overall spacing scale */
  spacing: SpacingScale;

  /** Typography style */
  typography: TypographyStyle;

  /** Border radius scale (0-2: none to very rounded) */
  borderRadius?: number;

  /** Use container max-width or full-width */
  containerWidth?: 'contained' | 'full' | 'wide';
}

// ==============================================================================
// COMPONENT TYPES
// ==============================================================================

/**
 * Button style variants
 */
export type ButtonVariant = 'square' | 'rounded' | 'pill' | 'sharp' | 'soft';

/**
 * Navigation style variants
 */
export type NavigationStyle = 'horizontal' | 'sidebar' | 'mega' | 'minimal';

/**
 * Component style configuration
 */
export interface ComponentStyles {
  /** Button style variant */
  buttons: ButtonVariant;

  /** Card style variant (references CardStyle) */
  cards: CardStyle;

  /** Navigation style */
  navigation: NavigationStyle;

  /** Use shadows on components */
  useShadows?: boolean;

  /** Use animations */
  useAnimations?: boolean;
}

// ==============================================================================
// TEMPLATE CONFIG
// ==============================================================================

/**
 * Complete template configuration (stored in site_templates.config JSONB)
 */
export interface TemplateConfig {
  /** Available color presets for this template */
  colorPresets: ColorPreset[];

  /** Layout configuration */
  layout: LayoutConfig;

  /** Component styles */
  components: ComponentStyles;

  /** Optional: Default preset index to use */
  defaultPresetIndex?: number;

  /** Optional: Custom CSS variables to inject */
  customCssVariables?: Record<string, string>;

  /** Optional: Template-specific feature flags */
  features?: {
    darkModeSupport?: boolean;
    customFonts?: boolean;
    gradientBackgrounds?: boolean;
    animatedElements?: boolean;
  };
}

// ==============================================================================
// SITE TEMPLATE (DATABASE MODEL)
// ==============================================================================

/**
 * Site template database model (from site_templates table)
 */
export interface SiteTemplate {
  /** Unique template ID */
  id: string;

  /** Display name (e.g., "Classic Sports") */
  name: string;

  /** URL-safe slug (e.g., "classic-sports") */
  slug: string;

  /** Short description of the template */
  description: string;

  /** Preview image URL (1920x1080 recommended) */
  preview_image_url: string | null;

  /** Whether template is available for selection */
  is_active: boolean;

  /** Whether this is a featured/recommended template */
  is_featured?: boolean;

  /** Template configuration (colors, layout, components) */
  config: TemplateConfig;

  /** Display order (lower = shown first) */
  sort_order: number;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;

  /** Optional: Creator user ID */
  created_by?: string | null;
}

// ==============================================================================
// TEMPLATE CUSTOMIZATION (LEAGUE-SPECIFIC)
// ==============================================================================

/**
 * Template customization object (stored in league_template_settings.customizations JSONB)
 */
export interface TemplateCustomization {
  /** Custom colors (overrides template presets) */
  colors?: ColorCustomization;

  /** Layout overrides */
  layout?: Partial<LayoutConfig>;

  /** Component style overrides */
  components?: Partial<ComponentStyles>;

  /** Typography overrides */
  typography?: {
    headingFont?: string;
    bodyFont?: string;
    fontSize?: 'small' | 'medium' | 'large';
  };

  /** Custom CSS to inject */
  customCss?: string;

  /** Custom logo URL */
  logoUrl?: string | null;

  /** Custom banner/hero image URL */
  bannerUrl?: string | null;
}

// ==============================================================================
// LEAGUE TEMPLATE SETTINGS (DATABASE MODEL)
// ==============================================================================

/**
 * League template settings database model (from league_template_settings table)
 */
export interface LeagueTemplateSettings {
  /** Unique setting ID */
  id: string;

  /** League ID reference */
  league_id: string;

  /** Selected template ID */
  template_id: string | null;

  /** League-specific customizations */
  customizations: TemplateCustomization;

  /** Optional: Cached compiled configuration */
  applied_config?: TemplateAppliedConfig | null;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;

  /** When template was last applied */
  applied_at?: string | null;

  /** User who applied the template */
  applied_by?: string | null;
}

// ==============================================================================
// APPLIED/COMPILED CONFIGURATION
// ==============================================================================

/**
 * Compiled template configuration (base template + league customizations merged)
 * Stored in league_template_settings.applied_config for performance
 */
export interface TemplateAppliedConfig {
  /** Final color values (preset + customizations) */
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    textLight: string;
    textDark: string;
  };

  /** Final layout configuration */
  layout: LayoutConfig;

  /** Final component styles */
  components: ComponentStyles;

  /** CSS variables to inject into :root */
  cssVariables: Record<string, string>;

  /** Timestamp of when config was compiled */
  compiledAt: string;

  /** Source template slug */
  templateSlug: string;
}

// ==============================================================================
// TEMPLATE SELECTION FORM DATA
// ==============================================================================

/**
 * Form data structure for template selection during signup
 */
export interface TemplateSelectionFormData {
  /** Selected template ID */
  templateId: string;

  /** Selected color preset name (or "custom") */
  colorPreset: string;

  /** Custom colors (if colorPreset is "custom") */
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };

  /** Optional: Uploaded logo file or URL */
  logo?: File | string | null;

  /** Optional: Uploaded banner file or URL */
  banner?: File | string | null;
}

// ==============================================================================
// HELPER TYPES
// ==============================================================================

/**
 * Template selector component props
 */
export interface TemplateSelectorProps {
  /** Available templates */
  templates: SiteTemplate[];

  /** Currently selected template ID */
  selectedTemplateId?: string | null;

  /** Callback when template is selected */
  onSelect: (templateId: string) => void;

  /** Show featured badge on recommended templates */
  showFeaturedBadge?: boolean;

  /** Grid columns (2-4) */
  columns?: 2 | 3 | 4;
}

/**
 * Template preview component props
 */
export interface TemplatePreviewProps {
  /** Template to preview */
  template: SiteTemplate;

  /** Optional customizations to apply */
  customizations?: TemplateCustomization;

  /** Preview device (desktop or mobile) */
  device?: 'desktop' | 'mobile';

  /** League data for preview */
  leagueData?: {
    name: string;
    tagline?: string;
    sport?: string;
  };
}

/**
 * Color picker component props
 */
export interface ColorPickerProps {
  /** Current color value (hex) */
  value: string;

  /** Callback when color changes */
  onChange: (color: string) => void;

  /** Label for the color picker */
  label: string;

  /** Optional preset colors to show */
  presets?: string[];

  /** Show transparency/alpha channel */
  showAlpha?: boolean;
}

// ==============================================================================
// UTILITY TYPES
// ==============================================================================

/**
 * Template with popularity data (for analytics)
 */
export interface TemplateWithStats extends SiteTemplate {
  /** Number of leagues using this template */
  usageCount: number;

  /** Percentage of total leagues */
  usagePercentage: number;

  /** Average rating (if ratings implemented) */
  averageRating?: number;
}

/**
 * Template filter options
 */
export interface TemplateFilterOptions {
  /** Only show active templates */
  activeOnly?: boolean;

  /** Only show featured templates */
  featuredOnly?: boolean;

  /** Search by name or description */
  searchQuery?: string;

  /** Filter by specific style */
  style?: 'classic' | 'modern' | 'bold' | 'minimal';
}

// ==============================================================================
// CONSTANTS
// ==============================================================================

/**
 * Default color values
 */
export const DEFAULT_COLORS = {
  primary: '#E31837',
  secondary: '#000000',
  accent: '#FFD700',
  textLight: '#FFFFFF',
  textDark: '#1A1A1A',
} as const;

/**
 * CSS variable names used in templates
 */
export const CSS_VARIABLE_NAMES = {
  PRIMARY: '--template-primary',
  SECONDARY: '--template-secondary',
  ACCENT: '--template-accent',
  TEXT_LIGHT: '--template-text-light',
  TEXT_DARK: '--template-text-dark',
  BORDER_RADIUS: '--template-border-radius',
  SPACING: '--template-spacing',
  CARD_SHADOW: '--template-card-shadow',
} as const;
