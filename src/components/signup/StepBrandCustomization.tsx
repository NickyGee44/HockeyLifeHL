/**
 * Step 3: Brand Customization Component
 *
 * Allows users to customize their league's brand colors and upload a logo.
 * Includes live preview of the selected template with applied customizations.
 *
 * @module components/signup/StepBrandCustomization
 * @since 2026-01-28
 * @agent Agent 3
 * @task 3.4 from ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md
 */

'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteTemplate, ColorPreset, TemplateCustomization } from '@/types/site-templates';
import { TemplatePreview } from './TemplatePreview';

// ============================================================================
// TYPES
// ============================================================================

export interface StepBrandCustomizationProps {
  /** The selected template */
  template: SiteTemplate;

  /** League name for preview */
  leagueName: string;

  /** League tagline for preview */
  tagline?: string;

  /** Currently selected preset name */
  selectedPresetName?: string;

  /** Custom colors (if not using a preset) */
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };

  /** Logo file */
  logoFile?: File | null;

  /** Callback when preset is selected */
  onPresetSelect: (presetName: string) => void;

  /** Callback when custom colors change */
  onCustomColorsChange: (colors: { primary: string; secondary: string; accent: string }) => void;

  /** Callback when logo is uploaded */
  onLogoUpload: (file: File | null) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StepBrandCustomization({
  template,
  leagueName,
  tagline,
  selectedPresetName,
  customColors,
  logoFile,
  onPresetSelect,
  onCustomColorsChange,
  onLogoUpload,
}: StepBrandCustomizationProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Determine the currently active preset or custom colors
  const activePreset = isCustomMode
    ? null
    : template.config.colorPresets.find((p) => p.name === selectedPresetName) ||
      template.config.colorPresets[template.config.defaultPresetIndex || 0];

  const activeColors = isCustomMode && customColors ? customColors : activePreset;

  // Generate logo preview URL
  useEffect(() => {
    if (logoFile) {
      const objectUrl = URL.createObjectURL(logoFile);
      setLogoPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setLogoPreview(null);
    }
  }, [logoFile]);

  // Handle preset selection
  const handlePresetClick = (preset: ColorPreset) => {
    setIsCustomMode(false);
    onPresetSelect(preset.name);
  };

  // Handle custom color mode
  const handleCustomModeToggle = () => {
    if (!isCustomMode) {
      // Entering custom mode - initialize with current preset colors
      const currentPreset = activePreset as ColorPreset;
      onCustomColorsChange({
        primary: currentPreset.primary,
        secondary: currentPreset.secondary,
        accent: currentPreset.accent,
      });
      onPresetSelect('custom');
    }
    setIsCustomMode(!isCustomMode);
  };

  // Handle custom color changes
  const handleColorChange = (colorType: 'primary' | 'secondary' | 'accent', value: string) => {
    onCustomColorsChange({
      ...customColors!,
      [colorType]: value,
    });
  };

  // Handle logo upload
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file must be less than 2MB');
        return;
      }
      onLogoUpload(file);
    }
  };

  // Remove logo
  const handleLogoRemove = () => {
    onLogoUpload(null);
    setLogoPreview(null);
  };

  // Build customizations for preview
  const customizations: TemplateCustomization = {
    colors: activeColors
      ? {
          primary: activeColors.primary,
          secondary: activeColors.secondary,
          accent: activeColors.accent,
        }
      : undefined,
    logoUrl: logoPreview || undefined,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Column: Color Customization (40% on desktop) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Color Presets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Color Schemes</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCustomModeToggle}
              className="text-sm"
            >
              {isCustomMode ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Use Preset
                </>
              ) : (
                'Customize Colors'
              )}
            </Button>
          </div>

          {!isCustomMode && (
            <div className="grid grid-cols-1 gap-3">
              {template.config.colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                    'hover:border-primary/50 hover:shadow-sm',
                    selectedPresetName === preset.name && !isCustomMode
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  )}
                >
                  {/* Color Swatches */}
                  <div className="flex gap-1.5">
                    <div
                      className="h-10 w-10 rounded border border-slate-200"
                      style={{ backgroundColor: preset.primary }}
                      title="Primary"
                    />
                    <div
                      className="h-10 w-10 rounded border border-slate-200"
                      style={{ backgroundColor: preset.secondary }}
                      title="Secondary"
                    />
                    <div
                      className="h-10 w-10 rounded border border-slate-200"
                      style={{ backgroundColor: preset.accent }}
                      title="Accent"
                    />
                  </div>

                  {/* Preset Name */}
                  <span className="font-medium text-sm flex-1 text-left">{preset.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Custom Color Pickers */}
          {isCustomMode && customColors && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="primary-color" className="text-sm font-semibold">
                  Primary Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={customColors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    className="h-11 w-20 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    className="h-11 flex-1 font-mono text-sm"
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-color" className="text-sm font-semibold">
                  Secondary Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary-color"
                    type="color"
                    value={customColors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                    className="h-11 w-20 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                    className="h-11 flex-1 font-mono text-sm"
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent-color" className="text-sm font-semibold">
                  Accent Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="accent-color"
                    type="color"
                    value={customColors.accent}
                    onChange={(e) => handleColorChange('accent', e.target.value)}
                    className="h-11 w-20 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColors.accent}
                    onChange={(e) => handleColorChange('accent', e.target.value)}
                    className="h-11 flex-1 font-mono text-sm"
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logo Upload */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            League Logo <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>

          {!logoPreview ? (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <label
                htmlFor="logo-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="bg-muted rounded-full p-3">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Upload your logo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, or SVG • Max 2MB
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm" className="mt-2">
                  Choose File
                </Button>
              </label>
            </div>
          ) : (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-4">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-16 w-16 object-contain rounded border bg-white"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{logoFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {logoFile && (logoFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLogoRemove}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Your logo will appear in the header and throughout your league site.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> You can always change your colors and logo later from your league
            settings.
          </p>
        </div>
      </div>

      {/* Right Column: Live Preview (60% on desktop) */}
      <div className="lg:col-span-3">
        <div className="sticky top-4">
          <Label className="text-base font-semibold mb-3 block">Live Preview</Label>
          <TemplatePreview
            template={template}
            customizations={customizations}
            selectedPreset={isCustomMode ? null : activePreset}
            leagueName={leagueName || 'Your League Name'}
            tagline={tagline || 'Your league tagline'}
            showDeviceToggle={true}
          />
        </div>
      </div>
    </div>
  );
}

export default StepBrandCustomization;
