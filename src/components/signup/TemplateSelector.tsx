"use client";

import { useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteTemplate, ColorPreset } from "@/types/site-templates";

export interface TemplateSelectorProps {
  templates: SiteTemplate[];
  selectedTemplateId?: string | null;
  onSelect: (templateId: string) => void;
  showFeaturedBadge?: boolean;
  columns?: 2 | 3 | 4;
}

export function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  showFeaturedBadge = true,
  columns = 3,
}: TemplateSelectorProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-6", gridCols[columns])}>
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selectedTemplateId === template.id}
          onSelect={() => onSelect(template.id)}
          showFeaturedBadge={showFeaturedBadge}
        />
      ))}
    </div>
  );
}

interface TemplateCardProps {
  template: SiteTemplate;
  isSelected: boolean;
  onSelect: () => void;
  showFeaturedBadge: boolean;
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  showFeaturedBadge,
}: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border-2 bg-card text-left transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected
          ? "border-primary shadow-md"
          : "border-border hover:border-primary/50"
      )}
      aria-label={`Select ${template.name} template`}
      aria-pressed={isSelected}
    >
      {/* Featured Badge */}
      {showFeaturedBadge && template.is_featured && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
          Recommended
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Check className="h-5 w-5" />
        </div>
      )}

      {/* Preview Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {template.preview_image_url ? (
          <Image
            src={template.preview_image_url}
            alt={`${template.name} preview`}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <span className="text-sm">No preview available</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Template Name */}
        <h3 className="mb-2 text-lg font-semibold">{template.name}</h3>

        {/* Description */}
        <p className="mb-4 flex-1 text-sm text-muted-foreground">
          {template.description}
        </p>

        {/* Color Presets Preview */}
        {template.config.colorPresets && template.config.colorPresets.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Color Options:
            </p>
            <div className="flex flex-wrap gap-2">
              {template.config.colorPresets.slice(0, 4).map((preset, index) => (
                <ColorPresetDots key={index} preset={preset} />
              ))}
              {template.config.colorPresets.length > 4 && (
                <span className="flex items-center text-xs text-muted-foreground">
                  +{template.config.colorPresets.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

interface ColorPresetDotsProps {
  preset: ColorPreset;
}

function ColorPresetDots({ preset }: ColorPresetDotsProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1"
      title={preset.name}
    >
      <div
        className="h-3 w-3 rounded-full border border-border"
        style={{ backgroundColor: preset.primary }}
        aria-label={`Primary: ${preset.primary}`}
      />
      <div
        className="h-3 w-3 rounded-full border border-border"
        style={{ backgroundColor: preset.secondary }}
        aria-label={`Secondary: ${preset.secondary}`}
      />
      <div
        className="h-3 w-3 rounded-full border border-border"
        style={{ backgroundColor: preset.accent }}
        aria-label={`Accent: ${preset.accent}`}
      />
    </div>
  );
}
