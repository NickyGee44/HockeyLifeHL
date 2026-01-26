"use client";

import { useEffect, useState } from "react";
import { InstallPrompt } from "./InstallPrompt";

/**
 * PWA Provider Component
 *
 * Registers service worker and manages PWA installation
 */
export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[PWA] Service workers not supported');
      return;
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[PWA] Service worker registered:', registration.scope);
        setIsServiceWorkerReady(true);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('[PWA] Update available');
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check for updates periodically (every hour)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('[PWA] Message from service worker:', event.data);

          if (event.data.type === 'SYNC_COMPLETE') {
            console.log(`[PWA] Synced ${event.data.count} offline entries`);
          }
        });
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    registerServiceWorker();

    // Initialize auto-sync for offline queue
    window.addEventListener('online', async () => {
      console.log('[PWA] Connection restored');
      // Trigger background sync
      if (isServiceWorkerReady && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          (registration as any).sync.register('sync-offline-queue');
        }
      }
    });

    // Cleanup
    return () => {
      // Remove event listeners if needed
    };
  }, [isServiceWorkerReady]);

  // Handle update prompt
  const handleUpdate = () => {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });

    // Reload page when new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  };

  return (
    <>
      {children}

      {/* Install Prompt */}
      <InstallPrompt />

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-card border rounded-lg shadow-lg p-4">
            <h3 className="font-semibold mb-2">Update Available</h3>
            <p className="text-sm text-muted-foreground mb-3">
              A new version of the scorekeeper app is available.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-medium"
              >
                Update Now
              </button>
              <button
                onClick={() => setUpdateAvailable(false)}
                className="px-3 py-1 border rounded text-sm"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
