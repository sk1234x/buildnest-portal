'use client';

import React from 'react';
import Link from 'next/link';
import { RoutineSlug, RoutineStatus } from '@/lib/routines/types';

export interface RoutineHeaderProps {
  slug: RoutineSlug;
  sessionDate: string;
  title: string;
  subtitle?: string;
  status?: RoutineStatus;
  energyLevel?: number;
  className?: string;
}

export function RoutineHeader({
  slug,
  sessionDate,
  title,
  subtitle,
  status = 'in_progress',
  energyLevel,
  className = '',
}: RoutineHeaderProps) {
  const getAnchorMeta = () => {
    switch (slug) {
      case 'morning_launchpad':
        return {
          icon: '🌅',
          anchorLabel: 'Anchor 1',
          accent: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400',
        };
      case 'day_momentum':
        return {
          icon: '⚡',
          anchorLabel: 'Anchor 2',
          accent: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20 dark:text-indigo-400',
        };
      case 'evening_shutdown':
        return {
          icon: '🌙',
          anchorLabel: 'Anchor 3',
          accent: 'text-teal-600 bg-teal-500/10 border-teal-500/20 dark:text-teal-400',
        };
    }
  };

  const meta = getAnchorMeta();

  return (
    <div
      data-testid="routine-header"
      className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
            >
              <span>&larr;</span> Dashboard
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.accent}`}
            >
              <span>{meta.icon}</span> {meta.anchorLabel}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs font-medium text-muted-foreground">
              {sessionDate}
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Right Status Badge & Panic Hook */}
        <div className="flex flex-wrap items-center gap-3">
          {energyLevel !== undefined && (
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground">
              <span>⚡ Energy:</span>
              <span className="font-bold text-primary">{energyLevel}/5</span>
            </div>
          )}

          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'
              }`}
            />
            {status === 'completed' ? 'Completed' : 'In Progress'}
          </div>

          <Link
            href="/unstick"
            className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition dark:text-amber-400"
            title="Instant 2-5 min micro-activation to break inertia"
          >
            <span>⚡</span> Unstick Me
          </Link>
        </div>
      </div>
    </div>
  );
}
