'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseGameTimerOptions {
  /** Period length in minutes (default: 20) */
  periodLengthMinutes: number;
  /** Total number of periods (default: 3) */
  periodCount: number;
  /** Initial period (default: 1) */
  initialPeriod?: number;
  /** Initial elapsed seconds within current period (default: 0) */
  initialElapsedSeconds?: number;
  /** Whether the timer is initially running */
  initialRunning?: boolean;
  /** Callback to sync timer state to server */
  onSync?: (state: TimerSyncState) => void;
  /** Sync interval in ms (default: 30000) */
  syncIntervalMs?: number;
}

export interface TimerSyncState {
  timerRunning: boolean;
  timerElapsedSeconds: number;
  currentPeriod: number;
}

interface UseGameTimerReturn {
  /** Time remaining in current period in seconds */
  timeRemaining: number;
  /** Formatted time string (MM:SS) */
  formattedTime: string;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Current period number */
  currentPeriod: number;
  /** Whether the current period has ended (time = 0:00) */
  periodEnded: boolean;
  /** Start/resume the timer */
  start: () => void;
  /** Stop/pause the timer */
  stop: () => void;
  /** Reset time for current period */
  reset: () => void;
  /** End current period and advance to next */
  endPeriod: () => void;
  /** Start a new period (sets period number and resets clock) */
  startPeriod: (periodNumber: number) => void;
  /** Get total elapsed seconds (for server sync) */
  getTotalElapsed: () => number;
  /** Whether we're in overtime */
  isOvertime: boolean;
}

export function useGameTimer(options: UseGameTimerOptions): UseGameTimerReturn {
  const {
    periodLengthMinutes,
    periodCount,
    initialPeriod = 1,
    initialElapsedSeconds = 0,
    initialRunning = false,
    onSync,
    syncIntervalMs = 30000,
  } = options;

  const periodLengthSeconds = periodLengthMinutes * 60;

  const [currentPeriod, setCurrentPeriod] = useState(initialPeriod);
  const [elapsedInPeriod, setElapsedInPeriod] = useState(initialElapsedSeconds);
  const [isRunning, setIsRunning] = useState(initialRunning);
  const [periodEnded, setPeriodEnded] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const elapsedAtStartRef = useRef(initialElapsedSeconds);
  const rafIdRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);

  const timeRemaining = Math.max(0, periodLengthSeconds - elapsedInPeriod);
  const isOvertime = currentPeriod > periodCount;

  const formattedTime = formatTime(timeRemaining);

  // Refs for animation loop values to avoid stale closures
  const periodLengthSecondsRef = useRef(periodLengthSeconds);
  const onSyncRef = useRef(onSync);
  const syncIntervalMsRef = useRef(syncIntervalMs);
  const currentPeriodRef = useRef(currentPeriod);

  useEffect(() => { periodLengthSecondsRef.current = periodLengthSeconds; }, [periodLengthSeconds]);
  useEffect(() => { onSyncRef.current = onSync; }, [onSync]);
  useEffect(() => { syncIntervalMsRef.current = syncIntervalMs; }, [syncIntervalMs]);
  useEffect(() => { currentPeriodRef.current = currentPeriod; }, [currentPeriod]);

  // Animation frame loop via ref to avoid self-reference declaration issues
  const tickFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    tickFnRef.current = () => {
      if (!startTimeRef.current) return;

      const now = performance.now();
      const deltaMs = now - startTimeRef.current;
      const newElapsed = elapsedAtStartRef.current + deltaMs / 1000;

      if (newElapsed >= periodLengthSecondsRef.current) {
        setElapsedInPeriod(periodLengthSecondsRef.current);
        setIsRunning(false);
        setPeriodEnded(true);
        startTimeRef.current = null;
        rafIdRef.current = null;
        return;
      }

      setElapsedInPeriod(newElapsed);

      const nowMs = Date.now();
      if (onSyncRef.current && nowMs - lastSyncRef.current >= syncIntervalMsRef.current) {
        lastSyncRef.current = nowMs;
        onSyncRef.current({
          timerRunning: true,
          timerElapsedSeconds: Math.floor(newElapsed),
          currentPeriod: currentPeriodRef.current,
        });
      }

      rafIdRef.current = requestAnimationFrame(() => tickFnRef.current?.());
    };
  });

  const scheduleNextTick = useCallback(() => {
    rafIdRef.current = requestAnimationFrame(() => tickFnRef.current?.());
  }, []);

  const start = useCallback(() => {
    if (isRunning || periodEnded) return;
    setIsRunning(true);
    startTimeRef.current = performance.now();
    elapsedAtStartRef.current = elapsedInPeriod;
    scheduleNextTick();
  }, [isRunning, periodEnded, elapsedInPeriod, scheduleNextTick]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    setIsRunning(false);
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    startTimeRef.current = null;

    // Sync on stop
    if (onSync) {
      onSync({
        timerRunning: false,
        timerElapsedSeconds: Math.floor(elapsedInPeriod),
        currentPeriod,
      });
    }
  }, [isRunning, elapsedInPeriod, currentPeriod, onSync]);

  const reset = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setIsRunning(false);
    setElapsedInPeriod(0);
    setPeriodEnded(false);
    startTimeRef.current = null;
    elapsedAtStartRef.current = 0;
  }, []);

  const endPeriod = useCallback(() => {
    stop();
    setElapsedInPeriod(periodLengthSeconds);
    setPeriodEnded(true);
  }, [stop, periodLengthSeconds]);

  const startPeriod = useCallback((periodNumber: number) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setCurrentPeriod(periodNumber);
    setElapsedInPeriod(0);
    setIsRunning(false);
    setPeriodEnded(false);
    startTimeRef.current = null;
    elapsedAtStartRef.current = 0;

    if (onSync) {
      onSync({
        timerRunning: false,
        timerElapsedSeconds: 0,
        currentPeriod: periodNumber,
      });
    }
  }, [onSync]);

  const getTotalElapsed = useCallback(() => {
    const completedPeriods = (currentPeriod - 1) * periodLengthSeconds;
    return completedPeriods + Math.floor(elapsedInPeriod);
  }, [currentPeriod, periodLengthSeconds, elapsedInPeriod]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    timeRemaining,
    formattedTime,
    isRunning,
    currentPeriod,
    periodEnded,
    start,
    stop,
    reset,
    endPeriod,
    startPeriod,
    getTotalElapsed,
    isOvertime,
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
