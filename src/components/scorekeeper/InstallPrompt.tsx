"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, Share, Plus } from "lucide-react";

/**
 * PWA Install Prompt Component
 *
 * Shows installation instructions for:
 * - Android: Native install prompt
 * - iOS: Manual instructions (Safari → Share → Add to Home Screen)
 */
export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Only show prompt if not installed
    if (standalone) {
      return;
    }

    // Check if user has dismissed prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // For iOS, show prompt after a short delay
    if (iOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }

    // For Android/Desktop - listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show native install prompt (Android/Desktop)
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    console.log(`[PWA] User ${outcome} the install prompt`);

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't show if already installed
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Install Scorekeeper App</CardTitle>
              <CardDescription>
                {isIOS
                  ? "Add to your iPad home screen for the best experience"
                  : "Install for offline access and faster loading"
                }
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isIOS ? (
            // iOS Instructions
            <div className="space-y-3">
              <p className="text-sm">To install on iOS:</p>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li className="flex items-start gap-2">
                  <Share className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Tap the <strong>Share</strong> button in Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <Plus className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Download className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Tap <strong>"Add"</strong> in the top right</span>
                </li>
              </ol>
              <div className="pt-2 text-xs text-muted-foreground border-t">
                <p>✓ Works offline at the rink</p>
                <p>✓ Optimized for iPad landscape mode</p>
                <p>✓ Faster than using Safari</p>
              </div>
            </div>
          ) : (
            // Android/Desktop Instructions
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={handleInstallClick}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                >
                  Not Now
                </Button>
              </div>
              <div className="text-xs text-muted-foreground border-t pt-2">
                <p>✓ Works offline at the rink</p>
                <p>✓ Faster loading & performance</p>
                <p>✓ Install on home screen</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
