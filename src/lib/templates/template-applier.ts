/**
 * Template Application System
 *
 * Utilities for applying site templates to league sites by generating CSS variables
 * and providing theme context for components.
 *
 * @module lib/templates/template-applier
 * @since 2026-01-28
 * @agent Agent 5
 * @task 4.1 from ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md
 */

import type {
  SiteTemplate,
  TemplateConfig,
  TemplateCustomization,
  ColorPreset,
  TemplateAppliedConfig,
} from '@/types/site-templates';

// ==============================================================================
// CSS VARIABLE GENERATION
// ==============================================================================

/**
 * Generate CSS variables from template config and customizations
 */
export function generateCssVariables(
  template: SiteTemplate,
  customizations?: TemplateCustomization,
  selectedPresetIndex?: number
): Record<string, string> {
  const config = template.config;
  const preset = getSelectedColorPreset(config, selectedPresetIndex);

  // Merge preset colors with custom colors
  const finalColors = {
    primary: customizations?.colors?.primary || preset?.primary || '#E31837',
    secondary: customizations?.colors?.secondary || preset?.secondary || '#000000',
    accent: customizations?.colors?.accent || preset?.accent || '#FFD700',
    textLight: customizations?.colors?.textLight || preset?.textLight || '#FFFFFF',
    textDark: customizations?.colors?.textDark || preset?.textDark || '#1A1A1A',
  };

  // Base color variables
  const variables: Record<string, string> = {
    '--template-primary': finalColors.primary,
    '--template-secondary': finalColors.secondary,
    '--template-accent': finalColors.accent,
    '--template-text-light': finalColors.textLight,
    '--template-text-dark': finalColors.textDark,
  };

  // Layout variables
  if (config.layout) {
    const borderRadius = config.layout.borderRadius !== undefined ? config.layout.borderRadius : 0.5;
    variables['--template-border-radius'] = `${borderRadius}rem`;
    variables['--template-container-width'] = getContainerWidth(config.layout.containerWidth);

    // Spacing scale
    const spacingMultiplier = getSpacingMultiplier(config.layout.spacing);
    variables['--template-spacing-xs'] = `${0.25 * spacingMultiplier}rem`;
    variables['--template-spacing-sm'] = `${0.5 * spacingMultiplier}rem`;
    variables['--template-spacing-md'] = `${1 * spacingMultiplier}rem`;
    variables['--template-spacing-lg'] = `${1.5 * spacingMultiplier}rem`;
    variables['--template-spacing-xl'] = `${2 * spacingMultiplier}rem`;
  }

  // Component variables
  if (config.components) {
    // Button styles
    variables['--template-button-radius'] = getButtonRadius(config.components.buttons);

    // Card styles
    variables['--template-card-shadow'] = getCardShadow(config.components.cards, config.components.useShadows);

    // Animation settings
    if (config.components.useAnimations) {
      variables['--template-transition-speed'] = '0.2s';
      variables['--template-transition-timing'] = 'ease-in-out';
    } else {
      variables['--template-transition-speed'] = '0s';
      variables['--template-transition-timing'] = 'linear';
    }
  }

  // Custom CSS variables from template config
  if (config.customCssVariables) {
    Object.entries(config.customCssVariables).forEach(([key, value]) => {
      variables[key] = value;
    });
  }

  // Custom CSS variables from customizations
  if (customizations?.typography) {
    if (customizations.typography.headingFont) {
      variables['--template-font-heading'] = customizations.typography.headingFont;
    }
    if (customizations.typography.bodyFont) {
      variables['--template-font-body'] = customizations.typography.bodyFont;
    }
  }

  return variables;
}

/**
 * Get selected color preset from config
 */
function getSelectedColorPreset(
  config: TemplateConfig,
  presetIndex?: number
): ColorPreset | null {
  if (!config.colorPresets || config.colorPresets.length === 0) {
    return null;
  }

  const index = presetIndex !== undefined ? presetIndex : (config.defaultPresetIndex || 0);
  return config.colorPresets[index] || config.colorPresets[0];
}

/**
 * Get container width value
 */
function getContainerWidth(width?: 'contained' | 'full' | 'wide'): string {
  switch (width) {
    case 'contained':
      return '1280px';
    case 'wide':
      return '1536px';
    case 'full':
      return '100%';
    default:
      return '1280px';
  }
}

/**
 * Get spacing multiplier based on spacing scale
 */
function getSpacingMultiplier(spacing?: 'compact' | 'normal' | 'relaxed' | 'spacious'): number {
  switch (spacing) {
    case 'compact':
      return 0.75;
    case 'relaxed':
      return 1.25;
    case 'spacious':
      return 1.5;
    case 'normal':
    default:
      return 1;
  }
}

/**
 * Get button border radius based on variant
 */
function getButtonRadius(variant?: 'square' | 'rounded' | 'pill' | 'sharp' | 'soft'): string {
  switch (variant) {
    case 'square':
      return '0.375rem';
    case 'rounded':
      return '0.5rem';
    case 'pill':
      return '9999px';
    case 'sharp':
      return '0';
    case 'soft':
      return '0.75rem';
    default:
      return '0.5rem';
  }
}

/**
 * Get card shadow value
 */
function getCardShadow(
  cardStyle?: 'elevated' | 'flat' | 'bordered' | 'shadow' | 'glass',
  useShadows?: boolean
): string {
  if (useShadows === false) {
    return 'none';
  }

  switch (cardStyle) {
    case 'elevated':
      return '0 4px 6px rgba(0, 0, 0, 0.1)';
    case 'shadow':
      return '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)';
    case 'glass':
      return '0 4px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    case 'flat':
    case 'bordered':
    default:
      return 'none';
  }
}

// ==============================================================================
// THEME CONTEXT GENERATION
// ==============================================================================

/**
 * Generate complete applied theme configuration
 */
export function generateAppliedConfig(
  template: SiteTemplate,
  customizations?: TemplateCustomization,
  selectedPresetIndex?: number
): TemplateAppliedConfig {
  const config = template.config;
  const preset = getSelectedColorPreset(config, selectedPresetIndex);

  const finalColors = {
    primary: customizations?.colors?.primary || preset?.primary || '#E31837',
    secondary: customizations?.colors?.secondary || preset?.secondary || '#000000',
    accent: customizations?.colors?.accent || preset?.accent || '#FFD700',
    textLight: customizations?.colors?.textLight || preset?.textLight || '#FFFFFF',
    textDark: customizations?.colors?.textDark || preset?.textDark || '#1A1A1A',
  };

  const cssVariables = generateCssVariables(template, customizations, selectedPresetIndex);

  return {
    colors: finalColors,
    layout: {
      ...config.layout,
      ...(customizations?.layout || {}),
    },
    components: {
      ...config.components,
      ...(customizations?.components || {}),
    },
    cssVariables,
    compiledAt: new Date().toISOString(),
    templateSlug: template.slug,
  };
}

// ==============================================================================
// CSS INJECTION
// ==============================================================================

/**
 * Apply CSS variables to the document root
 */
export function applyCssVariables(variables: Record<string, string>): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

/**
 * Remove template CSS variables from the document root
 */
export function removeCssVariables(variables: Record<string, string>): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  Object.keys(variables).forEach((property) => {
    root.style.removeProperty(property);
  });
}

// ==============================================================================
// STYLE INJECTION (for SSR/preview)
// ==============================================================================

/**
 * Generate inline style tag content for CSS variables
 * Useful for SSR or preview components
 */
export function generateInlineStyles(variables: Record<string, string>): string {
  const entries = Object.entries(variables)
    .map(([property, value]) => `  ${property}: ${value};`)
    .join('\n');

  return `:root {\n${entries}\n}`;
}

/**
 * Generate style props object for component inline styles
 */
export function generateStyleProps(variables: Record<string, string>): React.CSSProperties {
  const style: Record<string, string> = {};

  Object.entries(variables).forEach(([property, value]) => {
    style[property] = value;
  });

  return style as React.CSSProperties;
}

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

/**
 * Check if a color is light or dark (for contrast)
 */
export function isLightColor(color: string): boolean {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
}

/**
 * Get contrasting text color (light or dark) for a background
 */
export function getContrastingTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#1A1A1A' : '#FFFFFF';
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}
