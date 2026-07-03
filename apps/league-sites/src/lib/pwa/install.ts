'use client';

import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Listener = (event: BeforeInstallPromptEvent | null) => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => listener(deferredPrompt));
}

export function isStandaloneApp() {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosSafari() {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (
    window.navigator.platform === 'MacIntel' &&
    window.navigator.maxTouchPoints > 1
  );
  return isIos && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function initInstallPromptListener() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

export function subscribeToInstallPrompt(listener: Listener) {
  initInstallPromptListener();
  listeners.add(listener);
  listener(deferredPrompt);

  return () => {
    listeners.delete(listener);
  };
}

export async function promptInstallApp() {
  if (!deferredPrompt) return 'unavailable' as const;

  const prompt = deferredPrompt;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  deferredPrompt = null;
  notifyListeners();

  return outcome;
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone] = useState(() => isStandaloneApp());
  const [isIos] = useState(() => isIosSafari());

  useEffect(() => {
    return subscribeToInstallPrompt(setPromptEvent);
  }, []);

  return {
    canPromptInstall: !!promptEvent,
    isIos,
    isStandalone,
    promptInstallApp,
  };
}
