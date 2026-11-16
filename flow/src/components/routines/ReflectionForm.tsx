'use client';

import React, { useState } from 'react';
import { TaskItem, TaskStatus } from '@/lib/routines/types';

export interface ReflectionFormProps {
  sessionDate: string;
  completedTasks: TaskItem[];
  incompleteTasks: TaskItem[];
  initialReflectionNotes?: string;
  isCompleted?: boolean;
  onCompleteShutdown: (notes: string, deferredTaskIds: string[]) => void;
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void;
  className?: string;
}

export function ReflectionForm({
  completedTasks,
  incompleteTasks,
  initialReflectionNotes = '',
  isCompleted = false,
  onCompleteShutdown,
  onTaskStatusChange,
  className = '',
}: ReflectionFormProps) {
  const [reflectionNotes, setReflectionNotes] = useState(initialReflectionNotes);
  const [deferredTaskIds, setDeferredTaskIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(isCompleted);

  const toggleDeferTask = (taskId: string) => {
    if (deferredTaskIds.includes(taskId)) {
      setDeferredTaskIds(deferredTaskIds.filter((id) => id !== taskId));
    } else {
      setDeferredTaskIds([...deferredTaskIds, taskId]);
      if (onTaskStatusChange) {
        onTaskStatusChange(taskId, 'deferred');
      }
    }
  };

  const handleShutdownSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCompleteShutdown(reflectionNotes, deferredTaskIds);
    setSubmitted(true);
  };

  return (
    <div
      data-testid="reflection-form"
      className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            Evening Shutdown &amp; Loop Closure
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Celebrate micro-wins, reschedule guilt-free, and detach from work mode.
          </p>
        </div>
        <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
          🌙 Zeigarnik Closure
        </span>
      </div>

      {submitted ? (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <span className="text-3xl">🎉</span>
          <h3 className="mt-2 text-lg font-bold text-foreground">
            Shutdown Complete!
          </h3>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Your open cognitive loops are closed. Step away and recharge guilt-free.
          </p>
          {reflectionNotes && (
            <div className="mt-4 rounded-lg bg-card/60 p-3 text-left text-xs text-foreground italic border border-border">
              &ldquo;{reflectionNotes}&rdquo;
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleShutdownSubmit} className="mt-6 space-y-6">
          {/* 1. TODAY'S MICRO-WINS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Today&apos;s Micro-Wins ({completedTasks.length} Completed)
            </h3>

            {completedTasks.length > 0 ? (
              <div className="mt-2 space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span className="font-medium text-foreground">{task.title}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {task.actualMinutes ? `${task.actualMinutes}m` : `${task.estimatedMinutes}m`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-xs font-medium text-foreground">
                  Zero tasks completed today — and that is completely fine.
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Rest, recovery, and neurological reset are essential parts of human momentum.
                </p>
              </div>
            )}
          </div>

          {/* 2. GUILT-FREE DEFERRALS */}
          {incompleteTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Guilt-Free Deferrals ({incompleteTasks.length} Unfinished)
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Explicitly deferring unfinished tasks removes anxiety and prevents procrastination shame.
              </p>

              <div className="mt-2 space-y-2">
                {incompleteTasks.map((task) => {
                  const isDeferred =
                    deferredTaskIds.includes(task.id) || task.status === 'deferred';
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs"
                    >
                      <span className="font-medium text-foreground">{task.title}</span>
                      <button
                        type="button"
                        onClick={() => toggleDeferTask(task.id)}
                        className={`rounded-lg px-3 py-1 font-semibold transition ${
                          isDeferred
                            ? 'bg-teal-500/10 text-teal-600 border border-teal-500/30 dark:text-teal-400'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {isDeferred ? '✓ Defer to Tomorrow' : 'Defer to Tomorrow'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. EVENING REFLECTION NOTES */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              3. Evening Reflection &amp; Notes
            </h3>
            <textarea
              value={reflectionNotes}
              onChange={(e) => setReflectionNotes(e.target.value)}
              placeholder="What worked today? Any micro-insights or thoughts before unplugging?..."
              rows={3}
              className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 4. CLOSE THE LOOP ACTION */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-sm hover:bg-teal-700 transition focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              Close the Loop &amp; Complete Shutdown &rarr;
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
