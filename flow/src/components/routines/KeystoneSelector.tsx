'use client';

import React, { useState } from 'react';
import { TaskItem, TaskPriority, TaskStatus, RoutineSlug } from '@/lib/routines/types';
import { TaskRow } from './TaskRow';

export interface KeystoneSelectorProps {
  sessionDate: string;
  routineSlug?: RoutineSlug;
  tasks: TaskItem[];
  onTaskCreated: (
    title: string,
    priority: TaskPriority,
    estimatedMinutes: number,
    routineSlug: RoutineSlug
  ) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onPriorityChange?: (taskId: string, priority: TaskPriority) => void;
  onDelete?: (taskId: string) => void;
  className?: string;
}

export function KeystoneSelector({
  sessionDate,
  routineSlug = 'morning_launchpad',
  tasks,
  onTaskCreated,
  onStatusChange,
  onPriorityChange,
  onDelete,
  className = '',
}: KeystoneSelectorProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('keystone');
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demotionNotice, setDemotionNotice] = useState<string | null>(null);
  const [showBacklog, setShowBacklog] = useState(false);

  // Group today's tasks by priority
  const todaysTasks = tasks.filter((t) => t.sessionDate === sessionDate);
  const activeKeystone = todaysTasks.find(
    (t) => t.priority === 'keystone' && t.status !== 'done'
  );
  const completedKeystones = todaysTasks.filter(
    (t) => t.priority === 'keystone' && t.status === 'done'
  );
  const activeSecondaries = todaysTasks.filter(
    (t) => t.priority === 'secondary' && t.status !== 'done'
  );
  const backlogTasks = todaysTasks.filter(
    (t) => t.priority === 'backlog' && t.status !== 'done'
  );
  const doneTasks = todaysTasks.filter(
    (t) => t.status === 'done' && t.priority !== 'keystone'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDemotionNotice(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMessage('Task title cannot be empty');
      return;
    }
    if (cleanTitle.length > 500) {
      setErrorMessage('Task title exceeds maximum length of 500 characters');
      return;
    }
    if (estimatedMinutes < 1 || estimatedMinutes > 480) {
      setErrorMessage('Estimated minutes must be between 1 and 480');
      return;
    }

    // Predictive feedback for Rule of 3 demotion
    if (priority === 'keystone' && activeKeystone) {
      if (activeSecondaries.length < 2) {
        setDemotionNotice(
          `Rule of 3: Previous Keystone "${activeKeystone.title}" was demoted to Secondary.`
        );
      } else {
        setDemotionNotice(
          `Rule of 3: Previous Keystone "${activeKeystone.title}" was moved to Backlog (secondary slots full).`
        );
      }
    } else if (priority === 'secondary' && activeSecondaries.length >= 2) {
      setDemotionNotice(
        'Rule of 3: Secondary focus limit (2 max) reached. New task assigned to Backlog.'
      );
    }

    onTaskCreated(cleanTitle, priority, estimatedMinutes, routineSlug);
    setTitle('');
  };

  return (
    <div
      data-testid="keystone-selector"
      className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            Rule of 3 Focus Allocation
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Strictly 1 Keystone Focus + up to 2 Secondary Tasks. Prevent cognitive overload.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
            {activeKeystone ? '1/1 Keystone' : '0/1 Keystone'}
          </span>
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-indigo-600 dark:text-indigo-400">
            {activeSecondaries.length}/2 Secondary
          </span>
        </div>
      </div>

      {/* Demotion Notice Banner */}
      {demotionNotice && (
        <div
          data-testid="demotion-banner"
          className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
        >
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span>{demotionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setDemotionNotice(null)}
            className="text-amber-600 hover:text-amber-800 font-bold dark:text-amber-400"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. KEYSTONE FOCUS SECTION (Slot 1) */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Single Keystone Focus (Limit: 1)
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            The #1 non-negotiable priority today
          </span>
        </div>

        <div className="mt-2.5">
          {activeKeystone ? (
            <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-1 shadow-sm">
              <TaskRow
                task={activeKeystone}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onPriorityChange={onPriorityChange}
                className="border-none bg-transparent shadow-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 p-4 text-center">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                No active Keystone focus yet.
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Enter your highest-leverage task below to anchor your day.
              </p>
            </div>
          )}

          {completedKeystones.map((k) => (
            <div key={k.id} className="mt-2">
              <TaskRow
                task={k}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. SECONDARY TASKS SECTION (Limit: 2) */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Secondary Priorities (Max 2)
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Supporting tasks ({activeSecondaries.length}/2 active)
          </span>
        </div>

        <div className="mt-2.5 space-y-2">
          {activeSecondaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              Optional: Add up to 2 supporting tasks.
            </div>
          ) : (
            activeSecondaries.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onPriorityChange={onPriorityChange}
              />
            ))
          )}
        </div>
      </div>

      {/* 3. TASK CREATION FORM */}
      <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-border bg-muted/20 p-4">
        <h4 className="text-xs font-bold text-foreground">Add Task to Today&apos;s Plan</h4>

        {errorMessage && (
          <p className="mt-2 text-xs font-semibold text-destructive">{errorMessage}</p>
        )}

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Draft Product Architecture Spec"
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="flex items-center gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="h-10 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="keystone">⭐ Keystone</option>
              <option value="secondary">🎯 Secondary</option>
              <option value="backlog">📦 Backlog</option>
            </select>

            <select
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              className="h-10 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={15}>15m</option>
              <option value={25}>25m</option>
              <option value={45}>45m</option>
              <option value={60}>60m</option>
              <option value={90}>90m</option>
            </select>

            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Add Task
            </button>
          </div>
        </div>
      </form>

      {/* 4. BACKLOG & COMPLETED DRAWER */}
      {(backlogTasks.length > 0 || doneTasks.length > 0) && (
        <div className="mt-6 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowBacklog(!showBacklog)}
            className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <span>
              📦 Backlog & Finished Tasks ({backlogTasks.length} backlog, {doneTasks.length} completed)
            </span>
            <span>{showBacklog ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {showBacklog && (
            <div className="mt-3 space-y-2">
              {backlogTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  onPriorityChange={onPriorityChange}
                />
              ))}
              {doneTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
