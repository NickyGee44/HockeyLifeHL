'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';

interface PickClockProps {
  expiresAt: string | null;
  isPaused: boolean;
  isMyPick: boolean;
  onTimeout?: () => void;
}

export function PickClock({ expiresAt, isPaused, isMyPick, onTimeout }: PickClockProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    if (!expiresAt || isPaused) return 0;
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    return Math.max(0, Math.floor((expiry - now) / 1000));
  }, [expiresAt, isPaused]);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    setIsExpired(false);

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining === 0 && !isExpired && expiresAt && !isPaused) {
        setIsExpired(true);
        onTimeout?.();
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [expiresAt, isPaused, calculateTimeLeft, isExpired, onTimeout]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Calculate progress percentage
  const totalTime = 90; // Default, should come from draft settings
  const progress = Math.min(100, (timeLeft / totalTime) * 100);

  // Determine urgency level
  const isUrgent = timeLeft <= 10;
  const isWarning = timeLeft <= 30 && timeLeft > 10;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl p-6 transition-all duration-300',
        isPaused && 'bg-muted/50',
        !isPaused && isMyPick && 'bg-rink-500/10 ring-2 ring-rink-500',
        !isPaused && !isMyPick && 'bg-card',
        isUrgent && !isPaused && 'animate-pulse bg-red-500/20 ring-red-500'
      )}
    >
      {/* Progress Ring */}
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90 transform">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            className="fill-none stroke-muted"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            className={cn(
              'fill-none transition-all duration-100',
              isUrgent ? 'stroke-red-500' : isWarning ? 'stroke-yellow-500' : 'stroke-rink-500'
            )}
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              'font-mono text-4xl font-bold tabular-nums',
              isPaused && 'text-muted-foreground',
              isUrgent && !isPaused && 'text-red-500',
              isWarning && !isPaused && 'text-yellow-500',
              !isUrgent && !isWarning && !isPaused && 'text-foreground'
            )}
          >
            {isPaused ? 'PAUSED' : formattedTime}
          </span>
        </div>
      </div>

      {/* Status text */}
      <div className="mt-4 text-center">
        {isMyPick && !isPaused && (
          <p className="text-sm font-medium text-rink-500">Your Pick!</p>
        )}
        {!isMyPick && !isPaused && (
          <p className="text-sm text-muted-foreground">Waiting...</p>
        )}
        {isPaused && (
          <p className="text-sm text-muted-foreground">Draft Paused</p>
        )}
      </div>
    </div>
  );
}
