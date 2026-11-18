'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { RoutineSlug } from '@/lib/routines/types';
import type { MicroActivationCategory, MicroActivationTask, UnstickRequest } from '@/lib/unstick/types';
import { getDeterministicFallback, getFallbackTask } from '@/lib/unstick/catalog';
import { CircularCountdownTimer } from '@/components/unstick/CircularCountdownTimer';

const CATEGORIES: { id: MicroActivationCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Protocols', icon: '✨' },
  { id: 'physical_somatic', label: 'Physical / Somatic', icon: '🏃' },
  { id: 'environmental', label: 'Environmental', icon: '🌿' },
  { id: 'atomic_friction', label: 'Atomic Friction', icon: '⚡' },
  { id: 'sensory_grounding', label: 'Sensory Grounding', icon: '🧘' },
];

const CATEGORY_COLORS: Record<
  MicroActivationCategory,
  { badge: string; border: string; glow: string }
> = {
  physical_somatic: {
    badge: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/10',
  },
  environmental: {
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/10',
  },
  atomic_friction: {
    badge: 'border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20',
    glow: 'shadow-violet-500/10',
  },
  sensory_grounding: {
    badge: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/10',
  },
};

function UnstickContent() {
  const searchParams = useSearchParams();

  const fromParam = searchParams.get('from');
  const categoryParam = searchParams.get('category') as MicroActivationCategory | null;
  const energyParam = searchParams.get('energy');

  const energyLevel = energyParam ? parseInt(energyParam, 10) : undefined;

  let currentRoutine: RoutineSlug | undefined = undefined;
  let initialReturnUrl = '/dashboard';
  let initialReturnLabel = 'Dashboard';

  if (fromParam === 'home') {
    initialReturnUrl = '/';
    initialReturnLabel = 'Home';
  } else if (fromParam === 'morning') {
    currentRoutine = 'morning_launchpad';
    initialReturnUrl = '/routines/morning';
    initialReturnLabel = 'Morning Launchpad';
  } else if (fromParam === 'momentum') {
    currentRoutine = 'day_momentum';
    initialReturnUrl = '/routines/momentum';
    initialReturnLabel = 'Day Momentum Sprint';
  } else if (fromParam === 'evening') {
    currentRoutine = 'evening_shutdown';
    initialReturnUrl = '/routines/evening';
    initialReturnLabel = 'Evening Shutdown';
  }

  const [returnUrl, setReturnUrl] = useState(initialReturnUrl);
  const [returnLabel, setReturnLabel] = useState(initialReturnLabel);

  useEffect(() => {
    if (!fromParam) {
      try {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data }) => {
          if (!data?.session) {
            setReturnUrl('/');
            setReturnLabel('Home');
          }
        }).catch(() => {
          setReturnUrl('/');
          setReturnLabel('Home');
        });
      } catch {
        setReturnUrl('/');
        setReturnLabel('Home');
      }
    }
  }, [fromParam]);

  const [selectedCategory, setSelectedCategory] = useState<MicroActivationCategory | 'all'>(() => {
    if (
      categoryParam &&
      ['physical_somatic', 'environmental', 'atomic_friction', 'sensory_grounding'].includes(categoryParam)
    ) {
      return categoryParam;
    }
    return 'all';
  });

  const [task, setTask] = useState<MicroActivationTask>(() => {
    const prefCat = selectedCategory === 'all' ? undefined : selectedCategory;
    return getDeterministicFallback({
      currentRoutine,
      energyLevel,
      preferredCategory: prefCat,
    });
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch or cycle task
  const handleFetchTask = useCallback(
    async (categoryOverride?: MicroActivationCategory | 'all') => {
      setIsLoading(true);
      setIsCompleted(false);

      const targetCat = categoryOverride !== undefined ? categoryOverride : selectedCategory;
      const prefCat = targetCat === 'all' ? undefined : targetCat;

      const payload: UnstickRequest = {
        currentRoutine,
        energyLevel,
        preferredCategory: prefCat,
      };

      try {
        const response = await fetch('/api/unstick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const fetchedTask: MicroActivationTask = await response.json();
          setTask(fetchedTask);
        } else {
          // Instant deterministic fallback
          const fallback = getFallbackTask(prefCat, energyLevel, task.id);
          setTask(fallback);
        }
      } catch {
        const fallback = getFallbackTask(prefCat, energyLevel, task.id);
        setTask(fallback);
      } finally {
        setIsLoading(false);
      }
    },
    [currentRoutine, energyLevel, selectedCategory, task.id]
  );

  const handleCategoryChange = (cat: MicroActivationCategory | 'all') => {
    setSelectedCategory(cat);
    handleFetchTask(cat);
  };

  const handleTimerComplete = () => {
    setIsCompleted(true);
  };

  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.physical_somatic;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Top Breadcrumb & Return Link */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={returnUrl}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to {returnLabel}</span>
        </Link>

        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          <span>⚡</span>
          <span>Emergency Inertia Escape</span>
        </span>
      </div>

      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 shadow-md shadow-amber-500/10 mb-3">
          <span className="text-3xl">⚡</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Unstick Me Panic Button
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-md mx-auto">
          Executive dysfunction is a neurobiological friction point, not a personal flaw. Bypass planning
          and activate momentum with one gentle 2-to-5 minute reset.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-testid={`category-filter-${cat.id}`}
            onClick={() => handleCategoryChange(cat.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
              selectedCategory === cat.id
                ? 'bg-foreground text-background shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main Task Activation Card */}
      <div
        data-testid="unstick-page-card"
        className={`rounded-2xl border ${colors.border} bg-card p-6 sm:p-8 shadow-xl ${colors.glow} transition`}
      >
        {/* Card Header & Provenance */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${colors.badge}`}
          >
            <span>{task.category.replace('_', ' ').toUpperCase()}</span>
          </span>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
              ⏱ {task.durationMinutes} min
            </span>
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {task.source === 'gemini_llm' ? '✨ Gemini AI' : '⚡ Offline Protocol'}
            </span>
          </div>
        </div>

        {/* Task Title & Imperative Instruction */}
        <h2
          data-testid="page-task-title"
          className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
        >
          {task.title}
        </h2>

        <p
          data-testid="page-task-instruction"
          className="mt-3 text-base leading-relaxed text-foreground/90 font-medium"
        >
          {task.instruction}
        </p>

        {/* Neuroscience Mechanism Callout */}
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs sm:text-sm leading-relaxed text-amber-700 dark:text-amber-300">
          <span className="font-semibold block mb-1">🧠 Why this breaks inertia:</span>
          {task.whyItWorks}
        </div>

        {/* Integrated Circular Countdown Timer */}
        <div className="mt-8">
          <CircularCountdownTimer
            durationMinutes={task.durationMinutes}
            onComplete={handleTimerComplete}
          />
        </div>

        {/* Card Action Controls */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
          <button
            type="button"
            data-testid="page-try-another-btn"
            onClick={() => handleFetchTask()}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition active:scale-95 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isLoading ? 'Retrieving Reset...' : 'Shuffle Micro-Task'}</span>
          </button>

          <Link
            href={returnUrl}
            data-testid="page-complete-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            <span>{isCompleted ? `Return to ${returnLabel} 🚀` : "I'm Ready — Return ⚡"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnstickPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <UnstickContent />
    </Suspense>
  );
}
