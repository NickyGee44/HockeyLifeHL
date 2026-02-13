'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const VISIT_COUNT_KEY = 'pwa-visit-count';
const FIRST_VISIT_KEY = 'pwa-first-visit';
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MIN_VISITS = 3;
const MIN_ENGAGEMENT_MS = 5 * 60 * 1000; // 5 minutes

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const dismissedAt = parseInt(dismissed, 10);
  if (Date.now() - dismissedAt > DISMISS_DURATION_MS) {
    localStorage.removeItem(DISMISS_KEY);
    return false;
  }
  return true;
}

function hasEnoughEngagement(): boolean {
  if (typeof window === 'undefined') return false;

  // Check visit count
  const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
  localStorage.setItem(VISIT_COUNT_KEY, String(visits));
  if (visits >= MIN_VISITS) return true;

  // Check engagement time
  const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
  if (!firstVisit) {
    localStorage.setItem(FIRST_VISIT_KEY, String(Date.now()));
    return false;
  }
  return Date.now() - parseInt(firstVisit, 10) >= MIN_ENGAGEMENT_MS;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isDismissed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (hasEnoughEngagement()) {
        setShow(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300 md:bottom-6 md:left-auto md:right-6">
      <div className="flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
          <Download className="h-5 w-5 text-amber-500" />
        </div>
        <p className="flex-1 text-sm text-neutral-200">
          Install Beer League Hockey for faster access
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleInstall}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-amber-400 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
