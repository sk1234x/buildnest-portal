'use client';

import React from 'react';
import { TaskItem, TaskPriority, TaskStatus } from '@/lib/routines/types';

export interface TaskRowProps {
  task: TaskItem;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  onPriorityChange?: (taskId: string, priority: TaskPriority) => void;
  showPriorityBadge?: boolean;
  className?: string;
}

export function TaskRow({
  task,
  onStatusChange,
  onDelete,
  onPriorityChange,
  showPriorityBadge = true,
  className = '',
}: TaskRowProps) {
  const isDone = task.status === 'done';
  const isInProgress = task.status === 'in_progress';

  const handleToggle = () => {
    if (!onStatusChange) return;
    const nextStatus: TaskStatus = isDone ? 'todo' : 'done';
    onStatusChange(task.id, nextStatus);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'keystone':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span>⭐</span> Keystone
          </span>
        );
      case 'secondary':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Secondary
          </span>
        );
      case 'backlog':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Backlog
          </span>
        );
    }
  };

  return (
    <div
      data-testid={`task-row-${task.id}`}
      className={`group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-border/80 ${
        isDone ? 'bg-muted/20 opacity-75' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Accessible Completion Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={isDone}
          aria-label={`Mark "${task.title}" as ${isDone ? 'incomplete' : 'complete'}`}
          onClick={handleToggle}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            isDone
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-muted-foreground/30 hover:border-emerald-500'
          }`}
        >
          {isDone && (
            <svg
              className="h-3.5 w-3.5 stroke-current stroke-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Title and Metadata */}
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-medium ${
              isDone
                ? 'text-muted-foreground line-through'
                : 'text-foreground'
            }`}
          >
            {task.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>⏱️ {task.estimatedMinutes}m</span>
            {task.actualMinutes && (
              <span className="text-emerald-600 dark:text-emerald-400">
                (Actual: {task.actualMinutes}m)
              </span>
            )}
            {isInProgress && (
              <span className="inline-flex items-center gap-1 text-indigo-500 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                In Sprint
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Badges & Controls */}
      <div className="flex shrink-0 items-center gap-2">
        {showPriorityBadge && getPriorityBadge(task.priority)}

        {onPriorityChange && task.priority !== 'keystone' && !isDone && (
          <button
            type="button"
            onClick={() => onPriorityChange(task.id, 'keystone')}
            className="hidden text-xs text-amber-600 underline-offset-2 hover:underline sm:inline-block dark:text-amber-400"
            title="Make Keystone (Rule of 3 will demote current keystone)"
          >
            Promote
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            aria-label={`Delete task "${task.title}"`}
            onClick={() => onDelete(task.id)}
            className="text-muted-foreground/50 opacity-0 transition hover:text-destructive focus:opacity-100 group-hover:opacity-100"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
