'use client';

import { WifiOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F7FAFC] to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-md mx-auto px-4 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <div className="w-20 h-20 bg-[#1F4FD8]/10 dark:bg-[#1F4FD8]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-10 h-10 text-[#1F4FD8]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              You&apos;re Offline
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              It looks like you&apos;ve lost your internet connection. Please check your network and try again.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-[#1F4FD8] hover:bg-[#1F4FD8]/90 text-white"
            >
              Try Again
            </Button>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Go Home
              </Button>
            </Link>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="font-medium mb-1">💡 Tip</p>
            <p>
              Some pages may be available offline if you&apos;ve visited them recently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
