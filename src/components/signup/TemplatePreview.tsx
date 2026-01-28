/**
 * Template Preview Component
 *
 * Displays a live, interactive preview of a site template with custom colors applied.
 * Shows a miniature version of the league site including header, hero section, and card samples.
 *
 * @module components/signup/TemplatePreview
 * @since 2026-01-28
 * @agent Agent 3
 * @task 2.4 from ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md
 */

'use client';

import { useState, useMemo } from 'react';
import type {
  SiteTemplate,
  TemplateCustomization,
  ColorPreset
} from '@/types/site-templates';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface TemplatePreviewProps {
  /** The selected template to preview */
  template: SiteTemplate;

  /** Optional customizations to apply */
  customizations?: TemplateCustomization;

  /** Selected color preset (if any) */
  selectedPreset?: ColorPreset | null;

  /** League name to display in preview */
  leagueName?: string;

  /** League tagline to display in preview */
  tagline?: string;

  /** Whether to show device toggle buttons */
  showDeviceToggle?: boolean;

  /** Optional CSS class name */
  className?: string;
}

type DeviceMode = 'desktop' | 'mobile';

// ============================================================================
// COMPONENT
// ============================================================================

export function TemplatePreview({
  template,
  customizations,
  selectedPreset,
  leagueName = 'Your League Name',
  tagline = 'Your league tagline',
  showDeviceToggle = true,
  className,
}: TemplatePreviewProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  // ============================================================================
  // COMPUTE FINAL COLORS
  // ============================================================================

  const finalColors = useMemo(() => {
    // Start with default preset or first preset
    const defaultPreset = selectedPreset ||
      template.config.colorPresets[template.config.defaultPresetIndex || 0] ||
      template.config.colorPresets[0];

    // Merge with custom color overrides
    return {
      primary: customizations?.colors?.primary || defaultPreset.primary,
      secondary: customizations?.colors?.secondary || defaultPreset.secondary,
      accent: customizations?.colors?.accent || defaultPreset.accent,
      textLight: customizations?.colors?.textLight || defaultPreset.textLight || '#FFFFFF',
      textDark: customizations?.colors?.textDark || defaultPreset.textDark || '#1A1A1A',
    };
  }, [template, customizations, selectedPreset]);

  // ============================================================================
  // COMPUTE LAYOUT SETTINGS
  // ============================================================================

  const layoutSettings = useMemo(() => {
    return {
      headerStyle: customizations?.layout?.headerStyle || template.config.layout.headerStyle,
      cardStyle: customizations?.layout?.cardStyle || template.config.layout.cardStyle,
      spacing: customizations?.layout?.spacing || template.config.layout.spacing,
      borderRadius: customizations?.layout?.borderRadius ?? template.config.layout.borderRadius ?? 0.5,
      useShadows: customizations?.components?.useShadows ?? template.config.components.useShadows ?? true,
      useAnimations: customizations?.components?.useAnimations ?? template.config.components.useAnimations ?? true,
    };
  }, [template, customizations]);

  // ============================================================================
  // CSS VARIABLES
  // ============================================================================

  const cssVariables = useMemo(() => {
    const baseVariables = {
      '--preview-primary': finalColors.primary,
      '--preview-secondary': finalColors.secondary,
      '--preview-accent': finalColors.accent,
      '--preview-text-light': finalColors.textLight,
      '--preview-text-dark': finalColors.textDark,
      '--preview-border-radius': `${layoutSettings.borderRadius}rem`,
      '--preview-spacing': layoutSettings.spacing === 'compact' ? '0.75rem' :
                           layoutSettings.spacing === 'relaxed' ? '1.5rem' :
                           layoutSettings.spacing === 'spacious' ? '2rem' : '1rem',
    };

    // Add custom CSS variables from template config
    const customVars = template.config.customCssVariables || {};
    const mappedCustomVars: Record<string, string> = {};

    Object.entries(customVars).forEach(([key, value]) => {
      mappedCustomVars[key.replace('--', '--preview-')] = value;
    });

    return { ...baseVariables, ...mappedCustomVars };
  }, [finalColors, layoutSettings, template]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Device Toggle */}
      {showDeviceToggle && (
        <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded-lg w-fit mx-auto">
          <Button
            variant={deviceMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDeviceMode('desktop')}
            className="gap-2"
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Desktop</span>
          </Button>
          <Button
            variant={deviceMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDeviceMode('mobile')}
            className="gap-2"
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Mobile</span>
          </Button>
        </div>
      )}

      {/* Preview Container */}
      <div
        className={cn(
          'preview-container relative mx-auto border-4 border-muted rounded-lg overflow-hidden bg-white transition-all duration-300',
          deviceMode === 'desktop' ? 'w-full aspect-[16/10]' : 'w-[375px] aspect-[9/16] max-w-full',
          layoutSettings.useShadows && 'shadow-2xl',
        )}
        style={cssVariables as React.CSSProperties}
      >
        {/* Preview Content (Scaled) */}
        <div
          className={cn(
            'preview-content w-full h-full overflow-auto',
            layoutSettings.useAnimations && 'transition-all duration-200',
          )}
          style={{
            fontSize: deviceMode === 'desktop' ? '10px' : '8px',
          }}
        >
          {/* Header */}
          <PreviewHeader
            leagueName={leagueName}
            headerStyle={layoutSettings.headerStyle}
          />

          {/* Hero Section */}
          <PreviewHero
            leagueName={leagueName}
            tagline={tagline}
            headerStyle={layoutSettings.headerStyle}
          />

          {/* Content Cards */}
          <PreviewCards
            cardStyle={layoutSettings.cardStyle}
            useShadows={layoutSettings.useShadows}
          />
        </div>

        {/* Preview Label */}
        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
          Preview
        </div>
      </div>

      {/* Template Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p className="font-medium">{template.name}</p>
        <p className="text-xs">{selectedPreset?.name || 'Custom Colors'}</p>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PreviewHeaderProps {
  leagueName: string;
  headerStyle: string;
}

function PreviewHeader({ leagueName, headerStyle }: PreviewHeaderProps) {
  const headerHeight = headerStyle === 'compact' ? '4em' :
                       headerStyle === 'bold' ? '6em' : '5em';

  return (
    <header
      className="preview-header flex items-center justify-between px-[2em] border-b"
      style={{
        height: headerHeight,
        backgroundColor: 'var(--preview-primary)',
        color: 'var(--preview-text-light)',
        borderColor: 'var(--preview-secondary)',
      }}
    >
      {/* Logo / League Name */}
      <div className="font-bold" style={{ fontSize: '1.4em' }}>
        {leagueName}
      </div>

      {/* Nav Links */}
      <nav className="hidden md:flex gap-[1.5em]" style={{ fontSize: '0.9em' }}>
        <span>Schedule</span>
        <span>Standings</span>
        <span>Teams</span>
        <span>Stats</span>
      </nav>

      {/* CTA Button */}
      <div
        className="preview-button px-[1.2em] py-[0.5em] rounded"
        style={{
          backgroundColor: 'var(--preview-accent)',
          color: 'var(--preview-text-dark)',
          borderRadius: 'var(--preview-border-radius)',
          fontSize: '0.85em',
        }}
      >
        Sign Up
      </div>
    </header>
  );
}

interface PreviewHeroProps {
  leagueName: string;
  tagline: string;
  headerStyle: string;
}

function PreviewHero({ leagueName, tagline, headerStyle }: PreviewHeroProps) {
  const heroPadding = headerStyle === 'bold' ? '4em' : '3em';

  return (
    <section
      className="preview-hero text-center"
      style={{
        padding: heroPadding,
        background: `linear-gradient(135deg, var(--preview-primary) 0%, var(--preview-secondary) 100%)`,
        color: 'var(--preview-text-light)',
      }}
    >
      <h1 className="font-bold mb-[0.5em]" style={{ fontSize: '2.5em' }}>
        {leagueName}
      </h1>
      <p className="mb-[1.5em] opacity-90" style={{ fontSize: '1.1em' }}>
        {tagline}
      </p>
      <div
        className="inline-block preview-button px-[2em] py-[0.8em] rounded font-medium"
        style={{
          backgroundColor: 'var(--preview-accent)',
          color: 'var(--preview-text-dark)',
          borderRadius: 'var(--preview-border-radius)',
          fontSize: '1em',
        }}
      >
        View Schedule
      </div>
    </section>
  );
}

interface PreviewCardsProps {
  cardStyle: string;
  useShadows: boolean;
}

function PreviewCards({ cardStyle, useShadows }: PreviewCardsProps) {
  const cardClasses = cn(
    'preview-card p-[1.5em] rounded',
    cardStyle === 'flat' && 'bg-gray-50',
    cardStyle === 'bordered' && 'bg-white border-2',
    cardStyle === 'elevated' && 'bg-white',
    cardStyle === 'shadow' && 'bg-white',
    cardStyle === 'glass' && 'bg-white/80 backdrop-blur',
    useShadows && (cardStyle === 'elevated' || cardStyle === 'shadow') && 'shadow-lg',
  );

  return (
    <section className="preview-cards p-[2em] bg-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[1.5em]">
        {/* Card 1 */}
        <div
          className={cardClasses}
          style={{
            borderRadius: 'var(--preview-border-radius)',
            borderColor: cardStyle === 'bordered' ? 'var(--preview-primary)' : undefined,
          }}
        >
          <div
            className="w-full h-[8em] rounded mb-[1em]"
            style={{
              backgroundColor: 'var(--preview-primary)',
              borderRadius: 'var(--preview-border-radius)',
            }}
          />
          <div className="font-bold mb-[0.5em]" style={{ fontSize: '1.1em', color: 'var(--preview-text-dark)' }}>
            Team Name
          </div>
          <div className="text-gray-600" style={{ fontSize: '0.85em' }}>
            Record: 10-5-2
          </div>
        </div>

        {/* Card 2 */}
        <div
          className={cardClasses}
          style={{
            borderRadius: 'var(--preview-border-radius)',
            borderColor: cardStyle === 'bordered' ? 'var(--preview-primary)' : undefined,
          }}
        >
          <div
            className="w-full h-[8em] rounded mb-[1em]"
            style={{
              backgroundColor: 'var(--preview-secondary)',
              borderRadius: 'var(--preview-border-radius)',
            }}
          />
          <div className="font-bold mb-[0.5em]" style={{ fontSize: '1.1em', color: 'var(--preview-text-dark)' }}>
            Next Game
          </div>
          <div className="text-gray-600" style={{ fontSize: '0.85em' }}>
            Friday 7:00 PM
          </div>
        </div>

        {/* Card 3 */}
        <div
          className={cardClasses}
          style={{
            borderRadius: 'var(--preview-border-radius)',
            borderColor: cardStyle === 'bordered' ? 'var(--preview-primary)' : undefined,
          }}
        >
          <div
            className="w-full h-[8em] rounded mb-[1em]"
            style={{
              backgroundColor: 'var(--preview-accent)',
              borderRadius: 'var(--preview-border-radius)',
            }}
          />
          <div className="font-bold mb-[0.5em]" style={{ fontSize: '1.1em', color: 'var(--preview-text-dark)' }}>
            Top Scorer
          </div>
          <div className="text-gray-600" style={{ fontSize: '0.85em' }}>
            24 Points
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TemplatePreview;
