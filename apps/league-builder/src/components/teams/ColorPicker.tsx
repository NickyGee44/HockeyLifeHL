'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import { Pipette, Check } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
  className?: string;
}

const DEFAULT_PRESETS = [
  // Reds
  '#E31837', '#DC2626', '#B91C1C', '#991B1B',
  // Oranges
  '#F97316', '#EA580C', '#C2410C',
  // Yellows / Golds
  '#22D3EE', '#EAB308', '#CA8A04',
  // Greens
  '#22C55E', '#16A34A', '#15803D', '#166534',
  // Blues
  '#3B82F6', '#2563EB', '#1D4ED8', '#1E3A8A',
  // Navy
  '#0F172A', '#1E293B', '#334155',
  // Purples
  '#8B5CF6', '#7C3AED', '#6D28D9',
  // Pinks
  '#EC4899', '#DB2777', '#BE185D',
  // Neutrals
  '#FFFFFF', '#F5F5F5', '#D4D4D4', '#A3A3A3',
  '#525252', '#262626', '#171717', '#000000',
];

export function ColorPicker({
  label,
  value,
  onChange,
  presetColors = DEFAULT_PRESETS,
  className,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomColor(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hex = e.target.value;
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }
    if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
      setCustomColor(hex);
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        onChange(hex);
      }
    }
  };

  // Calculate if text should be light or dark based on background
  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <label className="block text-sm font-medium text-neutral-300 mb-2">
        {label}
      </label>

      {/* Color Preview Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
          'bg-neutral-800 border-neutral-700',
          'hover:border-rink-500/50 focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20',
          isOpen && 'border-rink-500 ring-2 ring-rink-500/20'
        )}
      >
        <div
          className="w-8 h-8 rounded-lg border border-neutral-600 flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <div className="flex-1 text-left">
          <span className="text-white font-medium">{value.toUpperCase()}</span>
        </div>
        <Pipette className="w-4 h-4 text-neutral-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full p-4 bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Preset Colors Grid */}
          <div className="mb-4">
            <span className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">
              Presets
            </span>
            <div className="grid grid-cols-8 gap-1.5">
              {presetColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handlePresetClick(color)}
                  className={cn(
                    'w-7 h-7 rounded-lg border-2 transition-all hover:scale-110',
                    value === color
                      ? 'border-rink-500 ring-2 ring-rink-500/30'
                      : 'border-transparent hover:border-neutral-600'
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {value === color && (
                    <Check
                      className="w-4 h-4 mx-auto"
                      style={{ color: getContrastColor(color) }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Input */}
          <div className="pt-4 border-t border-neutral-800">
            <span className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">
              Custom Color
            </span>
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="color"
                value={customColor}
                onChange={handleCustomChange}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
              />
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                  #
                </span>
                <input
                  type="text"
                  value={customColor.replace('#', '')}
                  onChange={handleHexInput}
                  maxLength={6}
                  className={cn(
                    'w-full pl-7 pr-3 py-2 rounded-lg text-sm font-mono',
                    'bg-neutral-800 border border-neutral-700 text-white',
                    'focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20',
                    'uppercase'
                  )}
                  placeholder="000000"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <span className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">
              Preview
            </span>
            <div
              className="h-12 rounded-xl flex items-center justify-center font-bold"
              style={{
                backgroundColor: value,
                color: getContrastColor(value),
              }}
            >
              Sample Text
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ColorPicker;
