'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { TaskItem, TaskStatus } from '@/lib/routines/types';

export interface FocusSprintTimerProps {
  activeTask?: TaskItem;
  defaultDurationMinutes?: number;
  onSprintComplete?: (actualMinutes: number) => void;
  onTaskStatusChange?: (taskId: string, status: TaskStatus, actualMinutes?: number) => void;
  className?: string;
}

const PRESETS = [
  { label: '25m Focus', minutes: 25 },
  { label: '15m Quick', minutes: 15 },
  { label: '45m Deep', minutes: 45 },
  { label: '5m Rest', minutes: 5 },
];

export function FocusSprintTimer({
  activeTask,
  defaultDurationMinutes = 25,
  onSprintComplete,
  onTaskStatusChange,
  className = '',
}: FocusSprintTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(defaultDurationMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultDurationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Format time MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePresetSelect = (minutes: number) => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const secs = minutes * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
  };

  const toggleTimer = () => {
    if (!isRunning) {
      if (activeTask && activeTask.status === 'todo' && onTaskStatusChange) {
        onTaskStatusChange(activeTask.id, 'in_progress');
      }
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRemainingSeconds(totalSeconds);
  };

  const handleCompleteSprint = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const spentMinutes = Math.max(1, Math.round((totalSeconds - remainingSeconds) / 60));

    if (activeTask && onTaskStatusChange) {
      onTaskStatusChange(activeTask.id, 'done', spentMinutes);
    }
    if (onSprintComplete) {
      onSprintComplete(spentMinutes);
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            const spentMinutes = Math.round(totalSeconds / 60);
            if (activeTask && onTaskStatusChange) {
              onTaskStatusChange(activeTask.id, 'done', spentMinutes);
            }
            if (onSprintComplete) {
              onSprintComplete(spentMinutes);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, totalSeconds, activeTask, onTaskStatusChange, onSprintComplete]);

  // SVG Circular calculation
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div
      data-testid="focus-sprint-timer"
      className={`flex flex-col items-center rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}
    >
      {/* Active Task Banner */}
      <div className="w-full text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <span>⚡</span> Day Momentum Focus Sprint
        </span>

        {activeTask ? (
          <div className="mt-3">
            <h3 className="text-lg font-bold text-foreground sm:text-xl">
              {activeTask.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Estimated: {activeTask.estimatedMinutes}m • Priority: {activeTask.priority}
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <h3 className="text-base font-semibold text-foreground">
              No task selected
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sprint on your Keystone focus or general momentum.
            </p>
          </div>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {PRESETS.map((preset) => {
          const isCurrent = totalSeconds === preset.minutes * 60;
          return (
            <button
              key={preset.minutes}
              type="button"
              onClick={() => handlePresetSelect(preset.minutes)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                isCurrent
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Circular Progress & Digital Display */}
      <div className="relative mt-8 flex items-center justify-center">
        <svg className="h-56 w-56 -rotate-90 transform" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="stroke-muted/30"
            strokeWidth="10"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="stroke-primary transition-all duration-500 ease-linear"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span
            data-testid="timer-display"
            className="font-mono text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl"
          >
            {formatTime(remainingSeconds)}
          </span>
          <span className="mt-1 text-xs font-semibold text-muted-foreground">
            {isRunning ? 'FOCUSING' : remainingSeconds === 0 ? 'COMPLETE' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={toggleTimer}
          className={`h-11 rounded-xl px-6 text-xs font-bold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isRunning
              ? 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary'
          }`}
        >
          {isRunning ? '⏸ Pause Sprint' : '▶ Start Sprint'}
        </button>

        <button
          type="button"
          onClick={resetTimer}
          className="h-11 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted/50 transition focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Reset
        </button>

        {activeTask && (
          <button
            type="button"
            onClick={handleCompleteSprint}
            className="h-11 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 transition dark:text-emerald-400"
          >
            ✓ Mark Task Complete
          </button>
        )}
      </div>

      {/* Panic Button Emergency Action Hook */}
      <div className="mt-8 border-t border-border pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Brain freeze or task friction? Don&apos;t abandon the sprint.
        </p>
        <Link
          href="/unstick"
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/20 transition dark:text-amber-400"
        >
          <span>⚡</span> Unstick Me: 2-5 min micro-activation
        </Link>
      </div>
    </div>
  );
}
