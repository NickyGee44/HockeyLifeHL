'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

/* ============================================================
   Theme Provider for Beer League Hockey

   Features:
   - System preference detection (prefers-color-scheme)
   - localStorage persistence
   - Manual toggle override
   - Smooth transitions between themes
   - SSR-safe (no hydration mismatch)
   ============================================================ */

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'hhl-theme-preference';

// Script to inject into <head> to prevent flash of wrong theme
// This runs before React hydrates
export const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('${STORAGE_KEY}');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var resolved = theme === 'system' || !theme ? (systemDark ? 'dark' : 'light') : theme;
      document.documentElement.setAttribute('data-theme', resolved);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
`;

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  enableTransition?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  enableSystem = true,
  enableTransition = true,
}: ThemeProviderProps) {
  // Initialize with undefined to avoid hydration mismatch
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      return stored || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return resolveTheme(theme);
  });

  const [mounted, setMounted] = useState(false);

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme, withTransition = true) => {
    const resolved = resolveTheme(newTheme);
    const root = document.documentElement;

    // Add transition class for smooth color changes
    if (enableTransition && withTransition) {
      root.classList.add('theme-transition');
    }

    // Apply the theme
    root.setAttribute('data-theme', resolved);
    setResolvedTheme(resolved);

    // Remove transition class after animation completes
    if (enableTransition && withTransition) {
      const timeout = setTimeout(() => {
        root.classList.remove('theme-transition');
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [enableTransition]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage not available
    }
    applyTheme(newTheme);
  }, [applyTheme]);

  // Toggle between dark and light (ignoring system)
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystem || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, enableSystem, applyTheme]);

  // Initial setup on mount
  useEffect(() => {
    setMounted(true); // eslint-disable-line -- mounted state pattern for SSR hydration safety
    // Apply theme immediately on mount without transition to prevent flash
    applyTheme(theme, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: apply initial theme without transition; subsequent changes handled by the theme change effect below
  }, []);

  // Update when theme changes
  useEffect(() => {
    if (mounted) {
      applyTheme(theme); // eslint-disable-line -- theme application depends on mounted state
    }
  }, [theme, mounted, applyTheme]);

  // Prevent hydration mismatch by not rendering until mounted
  // But we still render children to avoid layout shift
  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to access theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Convenience hook that only returns mounted state
// Useful for components that need to wait for client-side hydration
export function useThemeMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // eslint-disable-line -- mounted state pattern for SSR hydration safety
  return mounted;
}

export default ThemeProvider;
