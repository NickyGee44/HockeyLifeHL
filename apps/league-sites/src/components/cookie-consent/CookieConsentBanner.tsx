'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCookieConsent, type CookiePreferences } from '@/hooks/use-cookie-consent';
import { createClient } from '@/lib/supabase/client';

/* ============================================================
   GDPR Cookie Consent Banner (League Sites)

   A fixed-position banner at the bottom of the screen that
   allows users to accept or reject non-essential cookies.

   Features:
   - Slide-up animation on mount
   - "Accept All" and "Essential Only" quick actions
   - Expandable "Manage Preferences" with category toggles
   - Persists to localStorage + Supabase (if authenticated)
   - Keyboard accessible with proper ARIA attributes
   - Responsive: stacked on mobile, inline on desktop
   ============================================================ */

export function CookieConsentBanner() {
  const { consentGiven, mounted, saveConsent } = useCookieConsent();
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [functionalEnabled, setFunctionalEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Animate in after mount
  useEffect(() => {
    if (mounted && !consentGiven) {
      // Small delay for slide-up animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [mounted, consentGiven]);

  // Focus management: focus the banner when it appears
  useEffect(() => {
    if (isVisible && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [isVisible]);

  const persistToSupabase = useCallback(async (preferences: CookiePreferences) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const consents = [
        {
          user_id: user.id,
          consent_type: 'analytics_tracking' as const,
          granted: preferences.analytics,
          granted_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
        },
      ];

      for (const consent of consents) {
        // Upsert: check if a consent row exists, then update or insert
        const { data: existing } = await supabase
          .from('user_consents')
          .select('id')
          .eq('user_id', consent.user_id)
          .eq('consent_type', consent.consent_type)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_consents')
            .update({
              granted: consent.granted,
              granted_at: consent.granted_at,
              withdrawn_at: consent.granted ? null : new Date().toISOString(),
              user_agent: consent.user_agent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('user_consents')
            .insert(consent);
        }
      }
    } catch {
      // Silently fail - localStorage is the primary storage
      // Supabase sync is best-effort for logged-in users
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    const preferences: CookiePreferences = {
      essential: true,
      analytics: true,
      functional: true,
    };
    setIsExiting(true);
    setTimeout(() => {
      saveConsent(preferences);
      persistToSupabase(preferences);
    }, 300);
  }, [saveConsent, persistToSupabase]);

  const handleEssentialOnly = useCallback(() => {
    const preferences: CookiePreferences = {
      essential: true,
      analytics: false,
      functional: false,
    };
    setIsExiting(true);
    setTimeout(() => {
      saveConsent(preferences);
      persistToSupabase(preferences);
    }, 300);
  }, [saveConsent, persistToSupabase]);

  const handleSavePreferences = useCallback(() => {
    const preferences: CookiePreferences = {
      essential: true,
      analytics: analyticsEnabled,
      functional: functionalEnabled,
    };
    setIsExiting(true);
    setTimeout(() => {
      saveConsent(preferences);
      persistToSupabase(preferences);
    }, 300);
  }, [analyticsEnabled, functionalEnabled, saveConsent, persistToSupabase]);

  // Don't render on the server or if consent was already given
  if (!mounted || consentGiven) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      aria-describedby="cookie-consent-description"
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-sm transition-transform duration-300 ease-out ${
        isVisible && !isExiting ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
        {/* Main content */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1" id="cookie-consent-description">
            <p className="text-sm text-neutral-300">
              We use cookies to improve your experience. Essential cookies are required for the site
              to function. Analytics cookies help us understand how you use the site.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              ref={firstButtonRef}
              onClick={handleEssentialOnly}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors bg-neutral-700 hover:bg-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              aria-label="Accept essential cookies only"
            >
              Essential Only
            </button>
            <button
              onClick={handleAcceptAll}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-black transition-colors bg-amber-500 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              aria-label="Accept all cookies"
            >
              Accept All
            </button>
          </div>
        </div>

        {/* Manage Preferences toggle */}
        <div className="mt-3">
          <button
            onClick={() => setShowPreferences((prev) => !prev)}
            className="text-xs text-neutral-400 underline underline-offset-2 transition-colors hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 rounded"
            aria-expanded={showPreferences}
            aria-controls="cookie-preferences-panel"
          >
            {showPreferences ? 'Hide Preferences' : 'Manage Preferences'}
          </button>
        </div>

        {/* Preferences panel */}
        {showPreferences && (
          <div
            id="cookie-preferences-panel"
            role="region"
            aria-label="Cookie preference settings"
            className="mt-4 space-y-4 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4"
          >
            {/* Essential cookies */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-200">Essential Cookies</p>
                <p className="text-xs text-neutral-500">
                  Required for the site to function. Cannot be disabled.
                </p>
              </div>
              <div
                role="switch"
                aria-checked="true"
                aria-label="Essential cookies (always enabled)"
                tabIndex={0}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full border-2 border-transparent bg-amber-500/60 opacity-60"
              >
                <span className="pointer-events-none block h-5 w-5 translate-x-5 rounded-full bg-white shadow-lg" />
              </div>
            </div>

            {/* Analytics cookies */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-200">Analytics Cookies</p>
                <p className="text-xs text-neutral-500">
                  Help us understand site usage with Vercel Analytics.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={analyticsEnabled}
                aria-label="Toggle analytics cookies"
                onClick={() => setAnalyticsEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
                  analyticsEnabled ? 'bg-amber-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    analyticsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Functional cookies */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-200">Functional Cookies</p>
                <p className="text-xs text-neutral-500">
                  Remember your preferences like theme and language settings.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={functionalEnabled}
                aria-label="Toggle functional cookies"
                onClick={() => setFunctionalEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
                  functionalEnabled ? 'bg-amber-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    functionalEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Save preferences button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSavePreferences}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-black transition-colors bg-amber-500 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                aria-label="Save cookie preferences"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
