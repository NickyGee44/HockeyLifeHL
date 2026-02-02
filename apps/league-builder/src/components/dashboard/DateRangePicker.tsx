'use client';

import { useState, useCallback } from 'react';
import { cn } from '@hockey-life/ui';
import {
  DateRange,
  DATE_PRESETS,
  getDateRangeFromPreset,
  formatDateForAPI,
} from '@/lib/dashboard';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

/**
 * DateRangePicker - Date range selector with quick presets
 * Dark mode with gold accents per BRAND-KIT.md
 */
export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(formatDateForAPI(value.start));
  const [customEnd, setCustomEnd] = useState(formatDateForAPI(value.end));

  const handlePresetClick = useCallback(
    (preset: typeof DATE_PRESETS[number]) => {
      const range = getDateRangeFromPreset(preset);
      onChange(range);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleCustomApply = useCallback(() => {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start <= end) {
      onChange({ start, end, label: 'Custom' });
      setIsOpen(false);
    }
  }, [customStart, customEnd, onChange]);

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl',
          'bg-neutral-900 border border-gold-500/20',
          'text-white font-medium text-sm',
          'hover:border-gold-500/40 transition-all',
          'focus:outline-none focus:ring-2 focus:ring-gold-500/50'
        )}
      >
        <CalendarIcon className="w-4 h-4 text-gold-500" />
        <span>
          {value.label || `${formatDisplayDate(value.start)} - ${formatDisplayDate(value.end)}`}
        </span>
        <ChevronDownIcon
          className={cn(
            'w-4 h-4 text-neutral-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div
            className={cn(
              'absolute right-0 top-full mt-2 z-50',
              'w-80 p-4 rounded-xl',
              'bg-neutral-900 border border-gold-500/20',
              'shadow-lg shadow-black/50'
            )}
          >
            {/* Quick Presets */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Quick Select
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      'border border-transparent',
                      value.label === preset.label
                        ? 'bg-gold-500/20 text-gold-400 border-gold-500/40'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-800 my-4" />

            {/* Custom Range */}
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Custom Range
              </p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-neutral-500 mb-1">Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-neutral-950 border border-neutral-700',
                      'text-white',
                      'focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500'
                    )}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-neutral-500 mb-1">End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-neutral-950 border border-neutral-700',
                      'text-white',
                      'focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500'
                    )}
                  />
                </div>
              </div>
              <button
                onClick={handleCustomApply}
                className={cn(
                  'w-full py-2 rounded-lg font-semibold text-sm',
                  'bg-gradient-to-r from-gold-500 to-gold-600 text-black',
                  'hover:shadow-lg hover:shadow-gold-500/20 transition-all'
                )}
              >
                Apply Custom Range
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Icon components
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
