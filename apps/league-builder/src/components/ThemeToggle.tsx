'use client';

import { useTheme, useThemeMounted } from './ThemeProvider';

/* ============================================================
   Theme Toggle Component

   A premium toggle button for switching between dark and light modes.
   Features:
   - Animated icon transition (Sun/Moon)
   - Accessible (proper aria labels, keyboard navigation)
   - Respects reduced motion preferences
   - Multiple size variants
   ============================================================ */

interface ThemeToggleProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show label text */
  showLabel?: boolean;
  /** Custom aria label */
  ariaLabel?: string;
}

// Sun icon for light mode
const SunIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
  </svg>
);

// Moon icon for dark mode
const MoonIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
    />
  </svg>
);

// Computer/System icon
const SystemIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
    />
  </svg>
);

const sizeClasses = {
  sm: {
    button: 'p-1.5',
    icon: 'w-4 h-4',
    label: 'text-xs',
  },
  md: {
    button: 'p-2',
    icon: 'w-5 h-5',
    label: 'text-sm',
  },
  lg: {
    button: 'p-2.5',
    icon: 'w-6 h-6',
    label: 'text-base',
  },
};

export function ThemeToggle({
  size = 'md',
  className = '',
  showLabel = false,
  ariaLabel,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = useThemeMounted();

  const sizes = sizeClasses[size];
  const isDark = resolvedTheme === 'dark';

  // Generate aria label
  const label = ariaLabel || `Switch to ${isDark ? 'light' : 'dark'} mode`;

  // Placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className={`
          ${sizes.button}
          rounded-lg
          bg-[var(--color-surface)]
          border border-[var(--color-border)]
          text-[var(--color-text-secondary)]
          transition-colors duration-200
          ${className}
        `}
        aria-label="Toggle theme"
        disabled
      >
        <div className={`${sizes.icon} opacity-0`} />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizes.button}
        rounded-lg
        bg-[var(--color-surface)]
        border border-[var(--color-border)]
        text-[var(--color-text-secondary)]
        hover:text-[var(--color-accent)]
        hover:border-[var(--color-accent)]
        hover:bg-[var(--color-accent-muted)]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[var(--color-accent)]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--color-background)]
        transition-colors duration-200
        inline-flex items-center gap-2
        ${className}
      `}
      aria-label={label}
      title={label}
    >
      {/* Icon with rotation animation */}
      <span className="relative">
        {/* Sun icon (visible in dark mode, indicating switch to light) */}
        <SunIcon
          className={`
            ${sizes.icon}
            transition-all duration-300
            ${isDark ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90 absolute inset-0'}
          `}
        />
        {/* Moon icon (visible in light mode, indicating switch to dark) */}
        <MoonIcon
          className={`
            ${sizes.icon}
            transition-all duration-300
            ${!isDark ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90 absolute inset-0'}
          `}
        />
      </span>

      {/* Optional label */}
      {showLabel && (
        <span className={`${sizes.label} font-medium`}>
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}

/* ============================================================
   Theme Dropdown - More options including system preference
   ============================================================ */

interface ThemeDropdownProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function ThemeDropdown({ size = 'md', className = '' }: ThemeDropdownProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useThemeMounted();

  const sizes = sizeClasses[size];

  const options = [
    { value: 'light' as const, label: 'Light', icon: SunIcon },
    { value: 'dark' as const, label: 'Dark', icon: MoonIcon },
    { value: 'system' as const, label: 'System', icon: SystemIcon },
  ];

  if (!mounted) {
    return (
      <div className={`${sizes.button} rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] ${className}`}>
        <div className={`${sizes.icon} opacity-0`} />
      </div>
    );
  }

  const currentOption = options.find(o => o.value === theme) || options[1];
  const CurrentIcon = currentOption.icon;

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
        className={`
          ${sizes.button}
          appearance-none
          pr-8
          rounded-lg
          bg-[var(--color-surface)]
          border border-[var(--color-border)]
          text-[var(--color-text-secondary)]
          hover:text-[var(--color-accent)]
          hover:border-[var(--color-accent)]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[var(--color-accent)]
          cursor-pointer
          transition-colors duration-200
          ${sizes.label} font-medium
        `}
        aria-label="Select theme"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Custom dropdown icon */}
      <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
        <CurrentIcon className={sizes.icon} />
      </div>

      {/* Chevron */}
      <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

/* ============================================================
   Theme Switch - iOS-style toggle switch
   ============================================================ */

interface ThemeSwitchProps {
  /** Additional CSS classes */
  className?: string;
  /** Show icons inside the switch */
  showIcons?: boolean;
}

export function ThemeSwitch({ className = '', showIcons = true }: ThemeSwitchProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = useThemeMounted();

  const isDark = resolvedTheme === 'dark';

  if (!mounted) {
    return (
      <div className={`w-14 h-7 rounded-full bg-[var(--color-surface)] ${className}`} />
    );
  }

  return (
    <button
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={toggleTheme}
      className={`
        relative inline-flex h-7 w-14 shrink-0 cursor-pointer
        rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[var(--color-accent)]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--color-background)]
        ${isDark ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-neutral-300)]'}
        ${className}
      `}
    >
      {/* Switch knob */}
      <span
        className={`
          pointer-events-none inline-flex h-6 w-6 items-center justify-center
          transform rounded-full bg-white shadow-lg ring-0
          transition-transform duration-200 ease-in-out
          ${isDark ? 'translate-x-7' : 'translate-x-0'}
        `}
      >
        {showIcons && (
          <>
            <SunIcon
              className={`w-3.5 h-3.5 text-amber-500 transition-opacity duration-200 ${
                isDark ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <MoonIcon
              className={`w-3.5 h-3.5 text-indigo-600 absolute transition-opacity duration-200 ${
                isDark ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </>
        )}
      </span>
    </button>
  );
}

export default ThemeToggle;
