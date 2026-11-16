'use client';

import React from 'react';
import Link from 'next/link';
import { RoutineSlug, RoutineStatus } from '@/lib/routines/types';

export interface RoutineCardProps {
  slug: RoutineSlug;
  title: string;
  description: string;
  anchorNumber: 1 | 2 | 3;
  emoji: string;
  href: string;
  ctaText: string;
  status?: RoutineStatus;
  energyLevel?: number;
  taskCount?: number;
  completedTaskCount?: number;
  className?: string;
}

export function RoutineCard({
  title,
  description,
  anchorNumber,
  emoji,
  href,
  ctaText,
  status = 'pending',
  energyLevel,
  taskCount,
  completedTaskCount,
  className = '',
}: RoutineCardProps) {
  const getBadgeStyle = () => {
    switch (anchorNumber) {
      case 1:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 2:
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 3:
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
    }
  };

  const getStatusBadge = () => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Completed
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        Pending
      </span>
    );
  };

  return (
    <div
      data-testid={`routine-card-anchor-${anchorNumber}`}
      className={`flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md ${className}`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-2xl" role="img" aria-hidden="true">
            {emoji}
          </span>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getBadgeStyle()}`}
            >
              Anchor {anchorNumber}
            </span>
          </div>
        </div>

        <h2 className="mt-4 text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>

        {/* Metrics Row */}
        {(energyLevel !== undefined || taskCount !== undefined) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            {energyLevel !== undefined && (
              <span className="rounded-md bg-muted/40 px-2 py-1 font-medium">
                ⚡ Energy: {energyLevel}/5
              </span>
            )}
            {taskCount !== undefined && (
              <span className="rounded-md bg-muted/40 px-2 py-1 font-medium">
                📋 Tasks: {completedTaskCount ?? 0}/{taskCount} Done
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link
          href={href}
          className={`inline-flex h-9 w-full items-center justify-center rounded-lg border text-xs font-semibold transition hover:opacity-90 ${getBadgeStyle()}`}
        >
          {ctaText} &rarr;
        </Link>
      </div>
    </div>
  );
}
