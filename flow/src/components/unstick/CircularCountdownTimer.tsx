'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface CircularCountdownTimerProps {
  durationMinutes: number; // 2 to 5 minutes
  onComplete?: () => void;
  onTick?: (remainingSeconds: number) => void;
  autoStart?: boolean;
  enableSound?: boolean;
  className?: string;
}

/**
 * Plays a warm, harmonic dual-tone chime (C5 + E5) via Web Audio API.
 * Safe for SSR and resilient against browser autoplay restrictions.
 */
function playCompletionChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 1.25);

    // Tone 2: E5 (659.25 Hz) - slightly offset for warm harmony
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.08);
    gain2.gain.setValueAtTime(0.001, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 1.35);
  } catch {
    // Graceful silent fallback if AudioContext is unsupported or blocked
  }
}

/**
 * Clamps durationMinutes strictly to integer [2, 5].
 */
export function clampDuration(minutes: number): number {
  if (isNaN(minutes)) return 2;
  return Math.min(5, Math.max(2, Math.round(minutes)));
}

/**
 * Formats seconds into MM:SS format.
 */
export function formatTimeDisplay(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function CircularCountdownTimer({
  durationMinutes,
  onComplete,
  onTick,
  autoStart = false,
  enableSound = true,
  className = '',
}: CircularCountdownTimerProps) {
  const clampedMinutes = clampDuration(durationMinutes);
  const totalSeconds = clampedMinutes * 60;

  const [remainingSeconds, setRemainingSeconds] = useState<number>(totalSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);
  const hasCompletedRef = useRef<boolean>(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Synchronize when durationMinutes prop updates
  useEffect(() => {
    const newTotal = clampDuration(durationMinutes) * 60;
    setRemainingSeconds(newTotal);
    setIsRunning(false);
    setIsCompleted(false);
    hasCompletedRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [durationMinutes]);

  // Load sound mute preference safely from localStorage
  useEffect(() => {
    try {
      const storedMute = localStorage.getItem('flow_timer_muted');
      if (storedMute === 'true') {
        setIsSoundMuted(true);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const toggleSound = () => {
    setIsSoundMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('flow_timer_muted', String(next));
      } catch {}
      return next;
    });
  };

  const handleStart = useCallback(() => {
    if (remainingSeconds > 0 && !isCompleted) {
      hasCompletedRef.current = false;
      setIsRunning(true);
    }
  }, [remainingSeconds, isCompleted]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleToggle = useCallback(() => {
    if (isRunning) {
      handlePause();
    } else {
      handleStart();
    }
  }, [isRunning, handlePause, handleStart]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsCompleted(false);
    hasCompletedRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    const resetSeconds = clampDuration(durationMinutes) * 60;
    setRemainingSeconds(resetSeconds);
  }, [durationMinutes]);

  // Main countdown interval effect
  useEffect(() => {
    if (isRunning && !isCompleted) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsRunning(false);
            setIsCompleted(true);

            if (!hasCompletedRef.current) {
              hasCompletedRef.current = true;
              if (enableSound && !isSoundMuted) {
                playCompletionChime();
              }

              if (onCompleteRef.current) {
                onCompleteRef.current();
              }
            }
            return 0; // Clamped at 0, no negative values
          }

          const next = prev - 1;
          if (onTickRef.current) {
            onTickRef.current(next);
          }
          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isCompleted, enableSound, isSoundMuted]);

  // SVG circular dimensions
  const radius = 86;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const formattedTime = formatTimeDisplay(remainingSeconds);

  return (
    <div
      data-testid="circular-countdown-timer"
      className={`flex flex-col items-center justify-center ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {/* SVG Progress Ring */}
        <svg
          width="210"
          height="210"
          viewBox="0 0 210 210"
          className="transform"
          aria-label={`Timer countdown: ${formattedTime}`}
          role="img"
        >
          {/* Background Track */}
          <circle
            cx="105"
            cy="105"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/15 dark:text-muted/20"
          />

          {/* Draining Progress Ring */}
          <circle
            cx="105"
            cy="105"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 105 105)"
            className={`transition-all duration-500 ease-out ${
              isCompleted
                ? 'text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : isRunning
                  ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                  : 'text-amber-500/70'
            }`}
          />
        </svg>

        {/* Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            data-testid="timer-display"
            className="font-mono text-4xl font-extrabold tracking-tight text-foreground"
            aria-live="polite"
          >
            {formattedTime}
          </span>
          <span className="mt-1 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {isCompleted
              ? 'Complete! 🎉'
              : isRunning
                ? 'In Progress'
                : remainingSeconds < totalSeconds
                  ? 'Paused'
                  : 'Ready'}
          </span>
        </div>
      </div>

      {/* Timer Controls */}
      <div className="mt-5 flex items-center gap-3">
        {/* Play/Pause Toggle */}
        {!isCompleted ? (
          <button
            type="button"
            data-testid="timer-toggle-btn"
            onClick={handleToggle}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isRunning
                ? 'bg-muted text-foreground hover:bg-muted/80 focus:ring-muted'
                : 'bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600 focus:ring-amber-500'
            }`}
          >
            {isRunning ? (
              <>
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                <span>Pause</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>{remainingSeconds < totalSeconds ? 'Resume' : 'Start'}</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            data-testid="timer-restart-btn"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Restart</span>
          </button>
        )}

        {/* Reset Button */}
        {remainingSeconds < totalSeconds && !isCompleted && (
          <button
            type="button"
            data-testid="timer-reset-btn"
            onClick={handleReset}
            className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition active:scale-95"
            title="Reset Timer"
            aria-label="Reset Timer"
          >
            <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}

        {/* Sound Toggle */}
        <button
          type="button"
          data-testid="timer-sound-btn"
          onClick={toggleSound}
          className={`rounded-xl border border-border bg-card p-2.5 transition active:scale-95 ${
            isSoundMuted ? 'text-muted-foreground/50' : 'text-amber-500 hover:text-amber-600'
          }`}
          title={isSoundMuted ? 'Unmute Chime' : 'Mute Chime'}
          aria-label={isSoundMuted ? 'Unmute Chime' : 'Mute Chime'}
        >
          {isSoundMuted ? (
            <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
