'use client';

import { useState, useEffect, useMemo } from 'react';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
  shortFormatted: string;
}

/**
 * Hook for countdown timer to a target date
 * Updates every second
 */
export function useCountdown(targetDate: Date | string | null): CountdownResult {
  const target = useMemo(() => {
    if (!targetDate) return null;
    return typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  }, [targetDate]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!target) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
        formatted: 'No game scheduled',
        shortFormatted: '--',
      };
    }

    const diff = target.getTime() - now.getTime();

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
        formatted: 'Game time!',
        shortFormatted: 'Now',
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // Format based on time remaining
    let formatted: string;
    let shortFormatted: string;

    if (days > 0) {
      formatted = `${days}d ${hours}h ${minutes}m`;
      shortFormatted = `${days}d ${hours}h`;
    } else if (hours > 0) {
      formatted = `${hours}h ${minutes}m ${seconds}s`;
      shortFormatted = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      formatted = `${minutes}m ${seconds}s`;
      shortFormatted = `${minutes}m`;
    } else {
      formatted = `${seconds}s`;
      shortFormatted = `${seconds}s`;
    }

    return {
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
      formatted,
      shortFormatted,
    };
  }, [target, now]);
}

/**
 * Format countdown for display in large text
 */
export function formatCountdownParts(countdown: CountdownResult): {
  value: string;
  unit: string;
}[] {
  if (countdown.isExpired) {
    return [{ value: '--', unit: '' }];
  }

  const parts: { value: string; unit: string }[] = [];

  if (countdown.days > 0) {
    parts.push({ value: countdown.days.toString(), unit: 'd' });
    parts.push({ value: countdown.hours.toString().padStart(2, '0'), unit: 'h' });
    parts.push({ value: countdown.minutes.toString().padStart(2, '0'), unit: 'm' });
  } else if (countdown.hours > 0) {
    parts.push({ value: countdown.hours.toString(), unit: 'h' });
    parts.push({ value: countdown.minutes.toString().padStart(2, '0'), unit: 'm' });
    parts.push({ value: countdown.seconds.toString().padStart(2, '0'), unit: 's' });
  } else {
    parts.push({ value: countdown.minutes.toString(), unit: 'm' });
    parts.push({ value: countdown.seconds.toString().padStart(2, '0'), unit: 's' });
  }

  return parts;
}
