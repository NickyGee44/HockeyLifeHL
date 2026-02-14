'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

/* ============================================================
   Cookie Consent Hook

   Reads and manages GDPR cookie consent preferences stored
   in localStorage. Provides reactive state for conditional
   rendering of analytics and functional cookie providers.
   ============================================================ */

const STORAGE_KEY = 'cookie-consent-given';
const PREFERENCES_KEY = 'cookie-consent-preferences';

export interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean; // Vercel Analytics, tracking
  functional: boolean; // Theme preferences, UI settings
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  functional: false,
};

/**
 * Custom event dispatched when cookie consent changes,
 * so other components (e.g. layouts) can react immediately.
 */
const CONSENT_CHANGE_EVENT = 'cookie-consent-change';

function getStoredPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored) as CookiePreferences;
    }
  } catch {
    // localStorage not available or corrupted
  }
  return null;
}

function hasConsentBeenGiven(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useCookieConsent() {
  // Use lazy initializers to read localStorage during state init (SSR-safe)
  const [consentGiven, setConsentGiven] = useState<boolean>(() => hasConsentBeenGiven());
  const [preferences, setPreferences] = useState<CookiePreferences>(
    () => getStoredPreferences() ?? DEFAULT_PREFERENCES,
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Listen for consent changes from other components
  useEffect(() => {
    const handleConsentChange = () => {
      const given = hasConsentBeenGiven();
      setConsentGiven(given);
      if (given) {
        const stored = getStoredPreferences();
        if (stored) {
          setPreferences(stored);
        }
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
    };

    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
  }, []);

  const saveConsent = useCallback((newPreferences: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
    } catch {
      // localStorage not available
    }
    setConsentGiven(true);
    setPreferences(newPreferences);

    // Notify other components
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT));
  }, []);

  const resetConsent = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PREFERENCES_KEY);
    } catch {
      // localStorage not available
    }
    setConsentGiven(false);
    setPreferences(DEFAULT_PREFERENCES);

    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT));
  }, []);

  return {
    /** Whether the user has made a consent choice */
    consentGiven,
    /** Current cookie preferences */
    preferences,
    /** Whether the hook has mounted (SSR safety) */
    mounted,
    /** Whether analytics cookies are allowed */
    analyticsAllowed: consentGiven && preferences.analytics,
    /** Whether functional cookies are allowed */
    functionalAllowed: consentGiven && preferences.functional,
    /** Save consent preferences */
    saveConsent,
    /** Reset all consent (re-shows banner) */
    resetConsent,
  };
}
