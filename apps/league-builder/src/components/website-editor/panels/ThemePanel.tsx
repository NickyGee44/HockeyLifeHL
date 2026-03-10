'use client';

import { cn } from '@hockey-life/ui';
import { Palette, ChevronDown, LayoutTemplate } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEditor } from '../EditorContext';
import { COLOR_PRESETS, FONT_OPTIONS } from '../constants';

// ---------------------------------------------------------------------------
// Reusable ColorInput sub-component
// ---------------------------------------------------------------------------

interface ColorInputProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, description, value, onChange }: ColorInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1">{label}</label>
      <p className="text-xs text-neutral-500 mb-2">{description}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg font-mono text-sm text-neutral-300 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20"
          placeholder="#000000"
          maxLength={7}
        />
      </div>
    </div>
  );
}

const TEMPLATE_KEYS = ['dark', 'light', 'custom'] as const;

// ---------------------------------------------------------------------------
// ThemePanel
// ---------------------------------------------------------------------------

export function ThemePanel() {
  const { state, setField } = useEditor();
  const t = useTranslations('websiteEditor.theme');
  const tEditor = useTranslations('websiteEditor');

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4 text-rink-500" />
          {t('title')}
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          {t('subtitle')}
        </p>
      </div>

      {/* Color pickers */}
      <div className="rounded-lg border border-white/10 bg-neutral-900/50 p-3 text-xs text-neutral-400">
        Primary drives buttons and accents. Secondary now drives the site surfaces and background tint in both light and dark visitor modes, so navy, baby blue, or other brand-safe colors carry through more consistently.
      </div>

      <ColorInput
        label={t('primaryColor')}
        description={t('primaryDescription')}
        value={state.primaryColor}
        onChange={(v) => setField('primaryColor', v)}
      />

      <ColorInput
        label={t('secondaryColor')}
        description={t('secondaryDescription')}
        value={state.secondaryColor}
        onChange={(v) => setField('secondaryColor', v)}
      />

      <ColorInput
        label={t('accentColor')}
        description={t('accentDescription')}
        value={state.accentColor}
        onChange={(v) => setField('accentColor', v)}
      />

      {/* Color presets */}
      <div className="pt-4 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-3">{t('presets')}</h4>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setField('primaryColor', preset.primary);
                setField('secondaryColor', preset.secondary);
                setField('accentColor', preset.accent);
              }}
              className="group p-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex gap-1 mb-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.primary }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.secondary }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }} />
              </div>
              <span className="text-[10px] text-neutral-500 group-hover:text-neutral-300">
                {tEditor(`presetLabels.${preset.name}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Template selector */}
      <div className="pt-4 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-2">
          <LayoutTemplate className="w-3.5 h-3.5" />
          {tEditor('template.title')}
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {TEMPLATE_KEYS.map((key) => {
            const isActive = state.themePreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setField('themePreset', key)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition-colors',
                  isActive
                    ? 'border-rink-500 bg-rink-500/10 text-white'
                    : 'border-white/10 bg-neutral-900/40 text-neutral-300 hover:border-white/20 hover:bg-neutral-800/60',
                )}
              >
                <p className="text-sm font-medium">{tEditor(`template.${key}`)}</p>
                <p className="text-xs text-neutral-500">{tEditor(`template.${key}Description`)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font selector */}
      <div className="pt-4 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-3">{tEditor('typography')}</h4>
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">
            {t('fontFamily')}
          </label>
          <p className="text-xs text-neutral-500 mb-2">
            {t('fontDescription')}
          </p>
          <div className="relative">
            <select
              value={state.fontFamily}
              onChange={(e) => setField('fontFamily', e.target.value)}
              className={cn(
                'w-full appearance-none px-3 py-2 pr-8 bg-neutral-800 border border-white/10 rounded-lg',
                'text-sm text-neutral-300',
                'focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20',
                'cursor-pointer'
              )}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value} className="bg-neutral-900">
                  {font.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          </div>

          {/* Font preview */}
          <div
            className="mt-3 p-3 bg-neutral-800/50 rounded-lg border border-white/5"
            style={{ fontFamily: state.fontFamily }}
          >
            <p className="text-sm text-neutral-300">{tEditor('fontPreviewText')}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {tEditor('fontPreviewLabel', { fontFamily: state.fontFamily })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
