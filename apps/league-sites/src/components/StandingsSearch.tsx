'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface StandingsSearchProps {
  onSearch: (term: string) => void;
  placeholder?: string;
}

export function StandingsSearch({ onSearch, placeholder = 'Search teams...' }: StandingsSearchProps) {
  const [value, setValue] = useState('');
  const normalizedPlaceholder = placeholder.replace(/\.\.\./g, '…');

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onSearch(newValue);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className="relative">
      <label htmlFor="standings-search" className="sr-only">
        Search teams
      </label>
      <Search
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
      />
      <input
        id="standings-search"
        name="standingsSearch"
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder={normalizedPlaceholder}
        className="
          w-full pl-10 pr-10 py-2.5 rounded-lg
          bg-[var(--color-surface-hover)] border border-[var(--color-border)]
          text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]
          focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
          transition-colors duration-200
        "
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--color-border)] transition-colors"
        >
          <X aria-hidden="true" className="w-3 h-3 text-[var(--color-text-muted)]" />
        </button>
      )}
    </div>
  );
}
