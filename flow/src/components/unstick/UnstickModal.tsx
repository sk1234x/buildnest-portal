'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { RoutineSlug } from '@/lib/routines/types';
import type { MicroActivationCategory, MicroActivationTask, UnstickRequest } from '@/lib/unstick/types';
import { getDeterministicFallback } from '@/lib/unstick/catalog';
import { CircularCountdownTimer } from './CircularCountdownTimer';

export interface UnstickModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTask?: MicroActivationTask;
  currentRoutine?: RoutineSlug;
  energyLevel?: number;
  stuckContext?: string;
  onTaskCompleted?: (task: MicroActivationTask) => void;
  returnUrl?: string;
}

const CATEGORY_META: Record<
  MicroActivationCategory,
  { label: string; icon: string; badgeClass: string }
> = {
  physical_somatic: {
    label: 'Physical / Somatic',
    icon: '🏃',
    badgeClass: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  environmental: {
    label: 'Environmental',
    icon: '🌿',
    badgeClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  atomic_friction: {
    label: 'Atomic Friction',
    icon: '⚡',
    badgeClass: 'border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  sensory_grounding: {
    label: 'Sensory Grounding',
    icon: '🧘',
    badgeClass: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
};

export function UnstickModal({
  isOpen,
  onClose,
  initialTask,
  currentRoutine,
  energyLevel,
  stuckContext,
  onTaskCompleted,
  returnUrl,
}: UnstickModalProps) {
  const [task, setTask] = useState<MicroActivationTask>(() => {
    return initialTask || getDeterministicFallback({ currentRoutine, energyLevel, stuckContext });
  });
  const [isLoadingNext, setIsLoadingNext] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Sync initialTask if provided
  useEffect(() => {
    if (initialTask) {
      setTask(initialTask);
    }
  }, [initialTask]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Request another micro-activation task
  const handleTryAnother = useCallback(async () => {
    setIsLoadingNext(true);
    setIsCompleted(false);

    const payload: UnstickRequest = {
      currentRoutine,
      energyLevel,
      stuckContext,
    };

    try {
      const response = await fetch('/api/unstick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const nextTask: MicroActivationTask = await response.json();
        setTask(nextTask);
      } else {
        // Fall back to local catalog immediately if server API is unavailable
        const nextTask = getDeterministicFallback(payload, task.id);
        setTask(nextTask);
      }
    } catch {
      // Local fallback on any network error
      const nextTask = getDeterministicFallback(payload, task.id);
      setTask(nextTask);
    } finally {
      setIsLoadingNext(false);
    }
  }, [currentRoutine, energyLevel, stuckContext, task.id]);

  const handleTimerComplete = () => {
    setIsCompleted(true);
  };

  const handleDoneClick = () => {
    setIsCompleted(true);
    if (onTaskCompleted) {
      onTaskCompleted(task);
    }
    if (returnUrl && typeof window !== 'undefined') {
      window.location.href = returnUrl;
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const categoryInfo = CATEGORY_META[task.category] || CATEGORY_META.physical_somatic;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unstick-modal-title"
      data-testid="unstick-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl rounded-2xl border border-amber-500/20 bg-card p-6 sm:p-8 shadow-2xl shadow-amber-500/10 z-10 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header / Dismiss */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 font-bold text-lg">
              ⚡
            </span>
            <div>
              <h2
                id="unstick-modal-title"
                className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
              >
                Inertia Breaker
              </h2>
              <p className="text-xs text-muted-foreground">
                One micro-action to bypass paralysis. No planning required.
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="unstick-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Task Details Card */}
        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Category Badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${categoryInfo.badgeClass}`}
            >
              <span>{categoryInfo.icon}</span>
              <span>{categoryInfo.label}</span>
            </span>

            {/* Source Pill */}
            <span className="text-[11px] font-medium text-muted-foreground">
              {task.source === 'gemini_llm' ? '✨ Gemini AI' : '⚡ Offline Protocol'}
            </span>
          </div>

          <h3
            data-testid="unstick-task-title"
            className="mt-3 text-lg font-bold tracking-tight text-foreground"
          >
            {task.title}
          </h3>

          <p
            data-testid="unstick-task-instruction"
            className="mt-2 text-sm leading-relaxed text-foreground/90 font-medium"
          >
            {task.instruction}
          </p>

          {/* Why It Works Neuroscience Box */}
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            <span className="font-semibold block mb-0.5">🧠 Neuroscience mechanism:</span>
            {task.whyItWorks}
          </div>
        </div>

        {/* Integrated Circular Countdown Timer */}
        <div className="mt-6">
          <CircularCountdownTimer
            durationMinutes={task.durationMinutes}
            onComplete={handleTimerComplete}
          />
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
          <button
            type="button"
            data-testid="unstick-try-another-btn"
            onClick={handleTryAnother}
            disabled={isLoadingNext}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition active:scale-95 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${isLoadingNext ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isLoadingNext ? 'Finding Reset...' : 'Try Another'}</span>
          </button>

          <button
            type="button"
            data-testid="unstick-complete-btn"
            onClick={handleDoneClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            <span>{isCompleted ? 'Return with Momentum 🚀' : "I Did It — I'm Ready ⚡"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
