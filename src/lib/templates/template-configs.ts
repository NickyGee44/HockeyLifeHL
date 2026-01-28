/**
 * Site Template Configurations
 *
 * Defines the 5 core site templates available for leagues to choose from
 * during the signup process. Each template has unique styling, color presets,
 * and component configurations.
 *
 * @module lib/templates/template-configs
 * @since 2026-01-28
 * @agent Agent 3
 * @task 2.1 from ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md
 */

import type { SiteTemplate, TemplateConfig, ColorPreset } from '@/types/site-templates';

// ==============================================================================
// TEMPLATE 1: CLASSIC SPORTS
// ==============================================================================

const classicSportsColorPresets: ColorPreset[] = [
  {
    name: 'Hockey Red',
    primary: '#E31837',
    secondary: '#000000',
    accent: '#FFD700',
    textLight: '#FFFFFF',
    textDark: '#1A1A1A',
  },
  {
    name: 'Ice Blue',
    primary: '#0066CC',
    secondary: '#003366',
    accent: '#00CCFF',
    textLight: '#FFFFFF',
    textDark: '#1A1A1A',
  },
  {
    name: 'Championship Green',
    primary: '#006633',
    secondary: '#003300',
    accent: '#FFD700',
    textLight: '#FFFFFF',
    textDark: '#1A1A1A',
  },
  {
    name: 'Royal Purple',
    primary: '#5D3FD3',
    secondary: '#2E1A47',
    accent: '#FFD700',
    textLight: '#FFFFFF',
    textDark: '#1A1A1A',
  },
];

const classicSportsConfig: TemplateConfig = {
  colorPresets: classicSportsColorPresets,
  defaultPresetIndex: 0, // Hockey Red

  layout: {
    headerStyle: 'classic',
    cardStyle: 'elevated',
    spacing: 'normal',
    typography: 'sport',
    borderRadius: 0.5,
    containerWidth: 'contained',
  },

  components: {
    buttons: 'square',
    cards: 'shadow',
    navigation: 'horizontal',
    useShadows: true,
    useAnimations: true,
  },

  features: {
    darkModeSupport: false,
    customFonts: true,
    gradientBackgrounds: true,
    animatedElements: true,
  },

  customCssVariables: {
    '--font-heading': '"Bebas Neue", "Arial Black", sans-serif',
    '--font-body': '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    '--card-hover-lift': '4px',
    '--transition-speed': '0.2s',
  },
};

// ==============================================================================
// TEMPLATE 2: MODERN MINIMAL
// ==============================================================================

const modernMinimalColorPresets: ColorPreset[] = [
  {
    name: 'Minimal Gray',
    primary: '#2C3E50',
    secondary: '#34495E',
    accent: '#3498DB',
    textLight: '#ECF0F1',
    textDark: '#2C3E50',
  },
  {
    name: 'Clean Slate',
    primary: '#4A5568',
    secondary: '#718096',
    accent: '#48BB78',
    textLight: '#F7FAFC',
    textDark: '#1A202C',
  },
  {
    name: 'Modern Blue',
    primary: '#2563EB',
    secondary: '#1E40AF',
    accent: '#60A5FA',
    textLight: '#FFFFFF',
    textDark: '#1E293B',
  },
  {
    name: 'Elegant Black',
    primary: '#111827',
    secondary: '#1F2937',
    accent: '#F59E0B',
    textLight: '#F9FAFB',
    textDark: '#111827',
  },
];

const modernMinimalConfig: TemplateConfig = {
  colorPresets: modernMinimalColorPresets,
  defaultPresetIndex: 0, // Minimal Gray

  layout: {
    headerStyle: 'minimal',
    cardStyle: 'flat',
    spacing: 'relaxed',
    typography: 'modern',
    borderRadius: 0.75,
    containerWidth: 'wide',
  },

  components: {
    buttons: 'rounded',
    cards: 'bordered',
    navigation: 'minimal',
    useShadows: false,
    useAnimations: false,
  },

  features: {
    darkModeSupport: true,
    customFonts: true,
    gradientBackgrounds: false,
    animatedElements: false,
  },

  customCssVariables: {
    '--font-heading': '"Sora", "Helvetica Neue", sans-serif',
    '--font-body': '"Inter", -apple-system, sans-serif',
    '--border-width': '1px',
    '--transition-speed': '0.15s',
  },
};

// ==============================================================================
// TEMPLATE 3: BOLD & VIBRANT
// ==============================================================================

const boldVibrantColorPresets: ColorPreset[] = [
  {
    name: 'Electric Energy',
    primary: '#FF00FF',
    secondary: '#00FFFF',
    accent: '#FFFF00',
    textLight: '#FFFFFF',
    textDark: '#000000',
  },
  {
    name: 'Sunset Blast',
    primary: '#FF4500',
    secondary: '#FFD700',
    accent: '#FF69B4',
    textLight: '#FFFFFF',
    textDark: '#1A1A1A',
  },
  {
    name: 'Neon Nights',
    primary: '#00FF00',
    secondary: '#FF00FF',
    accent: '#00FFFF',
    textLight: '#FFFFFF',
    textDark: '#000000',
  },
  {
    name: 'Pop Art',
    primary: '#FF1493',
    secondary: '#1E90FF',
    accent: '#FFD700',
    textLight: '#FFFFFF',
    textDark: '#000000',
  },
];

const boldVibrantConfig: TemplateConfig = {
  colorPresets: boldVibrantColorPresets,
  defaultPresetIndex: 1, // Sunset Blast (most usable)

  layout: {
    headerStyle: 'bold',
    cardStyle: 'shadow',
    spacing: 'spacious',
    typography: 'bold',
    borderRadius: 1,
    containerWidth: 'full',
  },

  components: {
    buttons: 'pill',
    cards: 'shadow',
    navigation: 'horizontal',
    useShadows: true,
    useAnimations: true,
  },

  features: {
    darkModeSupport: false,
    customFonts: true,
    gradientBackgrounds: true,
    animatedElements: true,
  },

  customCssVariables: {
    '--font-heading': '"Righteous", "Impact", sans-serif',
    '--font-body': '"Poppins", sans-serif',
    '--card-hover-lift': '8px',
    '--transition-speed': '0.3s',
    '--gradient-angle': '135deg',
  },
};

// ==============================================================================
// TEMPLATE 4: DARK MODE PRO
// ==============================================================================

const darkModeProColorPresets: ColorPreset[] = [
  {
    name: 'Midnight',
    primary: '#10B981',
    secondary: '#6EE7B7',
    accent: '#34D399',
    textLight: '#F3F4F6',
    textDark: '#0B1220',
  },
  {
    name: 'Cyber Blue',
    primary: '#3B82F6',
    secondary: '#60A5FA',
    accent: '#93C5FD',
    textLight: '#F9FAFB',
    textDark: '#0F172A',
  },
  {
    name: 'Purple Haze',
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    accent: '#C4B5FD',
    textLight: '#F9FAFB',
    textDark: '#1E1B4B',
  },
  {
    name: 'Amber Glow',
    primary: '#F59E0B',
    secondary: '#FBBF24',
    accent: '#FCD34D',
    textLight: '#FFFBEB',
    textDark: '#78350F',
  },
];

const darkModeProConfig: TemplateConfig = {
  colorPresets: darkModeProColorPresets,
  defaultPresetIndex: 0, // Midnight

  layout: {
    headerStyle: 'modern',
    cardStyle: 'glass',
    spacing: 'normal',
    typography: 'modern',
    borderRadius: 1,
    containerWidth: 'contained',
  },

  components: {
    buttons: 'soft',
    cards: 'glass',
    navigation: 'horizontal',
    useShadows: false,
    useAnimations: true,
  },

  features: {
    darkModeSupport: true,
    customFonts: true,
    gradientBackgrounds: true,
    animatedElements: true,
  },

  customCssVariables: {
    '--font-heading': '"Space Grotesk", sans-serif',
    '--font-body': '"Inter", sans-serif',
    '--bg-dark': '#0B1220',
    '--bg-card': '#151C2C',
    '--glass-blur': '12px',
    '--glass-opacity': '0.1',
    '--transition-speed': '0.25s',
  },
};

// ==============================================================================
// TEMPLATE 5: COMMUNITY FRIENDLY
// ==============================================================================

const communityFriendlyColorPresets: ColorPreset[] = [
  {
    name: 'Warm Welcome',
    primary: '#F97316',
    secondary: '#FB923C',
    accent: '#FBBF24',
    textLight: '#FFFBEB',
    textDark: '#7C2D12',
  },
  {
    name: 'Friendly Green',
    primary: '#10B981',
    secondary: '#34D399',
    accent: '#6EE7B7',
    textLight: '#ECFDF5',
    textDark: '#064E3B',
  },
  {
    name: 'Community Blue',
    primary: '#0EA5E9',
    secondary: '#38BDF8',
    accent: '#7DD3FC',
    textLight: '#F0F9FF',
    textDark: '#0C4A6E',
  },
  {
    name: 'Social Purple',
    primary: '#A855F7',
    secondary: '#C084FC',
    accent: '#DDD6FE',
    textLight: '#FAF5FF',
    textDark: '#581C87',
  },
];

const communityFriendlyConfig: TemplateConfig = {
  colorPresets: communityFriendlyColorPresets,
  defaultPresetIndex: 0, // Warm Welcome

  layout: {
    headerStyle: 'compact',
    cardStyle: 'shadow',
    spacing: 'relaxed',
    typography: 'classic',
    borderRadius: 1.5,
    containerWidth: 'contained',
  },

  components: {
    buttons: 'rounded',
    cards: 'shadow',
    navigation: 'horizontal',
    useShadows: true,
    useAnimations: true,
  },

  features: {
    darkModeSupport: false,
    customFonts: true,
    gradientBackgrounds: false,
    animatedElements: true,
  },

  customCssVariables: {
    '--font-heading': '"Nunito", "Trebuchet MS", sans-serif',
    '--font-body': '"Open Sans", -apple-system, sans-serif',
    '--card-hover-lift': '2px',
    '--transition-speed': '0.2s',
    '--border-radius-large': '1.5rem',
  },
};

// ==============================================================================
// TEMPLATE DEFINITIONS (for seeding database)
// ==============================================================================

/**
 * All available templates
 * These will be used to seed the site_templates table
 */
export const SITE_TEMPLATES: Omit<SiteTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>[] = [
  {
    name: 'Classic Sports',
    slug: 'classic-sports',
    description: 'Traditional professional sports league aesthetic with bold colors and strong typography. Perfect for established leagues wanting a timeless look.',
    preview_image_url: '/templates/preview-classic-sports.jpg',
    is_active: true,
    is_featured: true, // Recommended
    config: classicSportsConfig,
    sort_order: 1,
  },
  {
    name: 'Modern Minimal',
    slug: 'modern-minimal',
    description: 'Clean, contemporary design with subtle elegance. Focused on content with minimal distractions. Great for professional leagues.',
    preview_image_url: '/templates/preview-modern-minimal.jpg',
    is_active: true,
    is_featured: false,
    config: modernMinimalConfig,
    sort_order: 2,
  },
  {
    name: 'Bold & Vibrant',
    slug: 'bold-vibrant',
    description: 'High-energy design with vibrant colors and dynamic elements. Stand out with a bold, energetic presence that matches your competitive spirit.',
    preview_image_url: '/templates/preview-bold-vibrant.jpg',
    is_active: true,
    is_featured: false,
    config: boldVibrantConfig,
    sort_order: 3,
  },
  {
    name: 'Dark Mode Pro',
    slug: 'dark-mode-pro',
    description: 'Premium dark theme with glass morphism effects. Modern and sophisticated, perfect for evening leagues and tech-savvy communities.',
    preview_image_url: '/templates/preview-dark-mode-pro.jpg',
    is_active: true,
    is_featured: false,
    config: darkModeProConfig,
    sort_order: 4,
  },
  {
    name: 'Community Friendly',
    slug: 'community-friendly',
    description: 'Warm, welcoming design that emphasizes community and fun. Approachable and friendly, perfect for recreational and social leagues.',
    preview_image_url: '/templates/preview-community-friendly.jpg',
    is_active: true,
    is_featured: false,
    config: communityFriendlyConfig,
    sort_order: 5,
  },
];

/**
 * Get template by slug
 */
export function getTemplateBySlug(slug: string) {
  return SITE_TEMPLATES.find((t) => t.slug === slug);
}

/**
 * Get featured/recommended templates
 */
export function getFeaturedTemplates() {
  return SITE_TEMPLATES.filter((t) => t.is_featured && t.is_active);
}

/**
 * Get all active templates
 */
export function getActiveTemplates() {
  return SITE_TEMPLATES.filter((t) => t.is_active).sort((a, b) => a.sort_order - b.sort_order);
}
