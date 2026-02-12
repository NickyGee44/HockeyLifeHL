'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePeriodTimerOptions {
  /** Period length in minutes (default: 20) */
  periodLengthMinutes?: number;
  /** Called when the timer reaches 0:00 */
  onPeriodEnd?: () => void;
}

interface UsePeriodTimerReturn {
  /** Seconds remaining in the current period */
  timeRemaining: number;
  /** Formatted time string (MM:SS) */
  displayTime: string;
  /** Whether the timer is currently counting down */
  isRunning: boolean;
  /** Start or resume the timer */
  start: () => void;
  /** Pause the timer */
  stop: () => void;
  /** Toggle between start and stop */
  toggle: () => void;
  /** Reset the timer to the full period length */
  reset: () => void;
  /** Color class based on time remaining */
  timerColorClass: string;
}

/**
 * Format seconds into MM:SS display string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * usePeriodTimer - Client-side countdown timer for scorekeeper period tracking.
 *
 * Uses a ref-based interval approach to avoid stale closure issues.
 * State is purely local (not persisted to database).
 */
export function usePeriodTimer({
  periodLengthMinutes = 20,
  onPeriodEnd,
}: UsePeriodTimerOptions = {}): UsePeriodTimerReturn {
  const periodLengthSeconds = periodLengthMinutes * 60;
  const [timeRemaining, setTimeRemaining] = useState(periodLengthSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onPeriodEndRef = useRef(onPeriodEnd);

  // Keep the callback ref current without triggering effect re-runs
  useEffect(() => {
    onPeriodEndRef.current = onPeriodEnd;
  }, [onPeriodEnd]);

  // Core timer effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            onPeriodEndRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeRemaining]);

  const start = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
    }
  }, [timeRemaining]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(periodLengthSeconds);
  }, [periodLengthSeconds]);

  // Determine color class based on time remaining
  let timerColorClass = 'text-white';
  if (timeRemaining > 0 && timeRemaining <= 60) {
    timerColorClass = 'text-red-400';
  } else if (timeRemaining > 0 && timeRemaining <= 120) {
    timerColorClass = 'text-yellow-400';
  }

  return {
    timeRemaining,
    displayTime: formatTime(timeRemaining),
    isRunning,
    start,
    stop,
    toggle,
    reset,
    timerColorClass,
  };
}
