import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Filter out Google Fonts caching rules — CSP blocks the SW from fetching
// external font resources, causing console errors
const runtimeCaching = defaultCache.filter(
  (entry) => {
    const urlPattern = entry.urlPattern;
    if (urlPattern instanceof RegExp) {
      return !urlPattern.source.includes('googleapis') && !urlPattern.source.includes('gstatic');
    }
    if (typeof urlPattern === 'string') {
      return !urlPattern.includes('googleapis') && !urlPattern.includes('gstatic');
    }
    return true;
  }
);

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
