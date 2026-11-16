'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoutineHeader } from '@/components/routines/RoutineHeader';
import { FocusSprintTimer } from '@/components/routines/FocusSprintTimer';
import { TaskRow } from '@/components/routines/TaskRow';
import {
  startRoutineSession,
  getTasksForDate,
  updateTaskStatus,
  updateTaskPriority,
  createTask,
  getSession,
  defaultRoutineService,
} from '@/lib/routines/service';
import { RoutineSession, TaskItem, TaskStatus, TaskPriority } from '@/lib/routines/types';

export default function DayMomentumPage() {
  const [today, setToday] = useState('');
  const [session, setSession] = useState<RoutineSession | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const currentDate = new Date().toISOString().split('T')[0];
    setToday(currentDate);

    // Load or start day_momentum session
    const existing = getSession('day_momentum', currentDate);
    const active = existing || startRoutineSession('day_momentum', currentDate);
    setSession(active);

    const currentTasks = getTasksForDate(currentDate);
    setTasks(currentTasks);

    // Auto-select Keystone task for sprint
    const keystone = currentTasks.find((t) => t.priority === 'keystone' && t.status !== 'done');
    const firstActive = keystone || currentTasks.find((t) => t.status !== 'done');
    if (firstActive) {
      setActiveTaskId(firstActive.id);
    }

    setMounted(true);
  }, []);

  const handleTaskStatusChange = (taskId: string, status: TaskStatus, actualMinutes?: number) => {
    if (!today) return;
    updateTaskStatus(taskId, status, actualMinutes);
    const updated = getTasksForDate(today);
    setTasks(updated);

    // If active task was completed, switch to next uncompleted task
    if (status === 'done' && taskId === activeTaskId) {
      const nextTask = updated.find((t) => t.status !== 'done');
      setActiveTaskId(nextTask ? nextTask.id : null);
    }
  };

  const handleAddUrgentKeystone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!today || !newTaskTitle.trim()) return;
    const created = createTask('day_momentum', newTaskTitle.trim(), 'keystone', 25, today);
    const updated = getTasksForDate(today);
    setTasks(updated);
    setActiveTaskId(created.id);
    setNewTaskTitle('');
  };

  const handlePromoteToKeystone = (taskId: string) => {
    if (!today) return;
    updateTaskPriority(taskId, 'keystone');
    const updated = getTasksForDate(today);
    setTasks(updated);
    setActiveTaskId(taskId);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!today) return;
    defaultRoutineService.deleteTask(taskId);
    const updated = getTasksForDate(today);
    setTasks(updated);
    if (activeTaskId === taskId) {
      const nextTask = updated.find((t) => t.status !== 'done');
      setActiveTaskId(nextTask ? nextTask.id : null);
    }
  };

  if (!mounted || !today) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    );
  }

  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const otherTasks = tasks.filter((t) => t.id !== activeTaskId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      {/* Anchor 2 Header */}
      <RoutineHeader
        slug="day_momentum"
        sessionDate={today}
        title="Day Momentum Block"
        subtitle="Single-task focus sprint, Pomodoro pacing, and zero-distraction execution."
        status={session?.status || 'in_progress'}
      />

      {/* Primary Focus Sprint Timer */}
      <FocusSprintTimer
        activeTask={activeTask}
        defaultDurationMinutes={activeTask ? activeTask.estimatedMinutes : 25}
        onTaskStatusChange={handleTaskStatusChange}
      />

      {/* Midday Keystone Pivot & Task Switcher */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Today&apos;s Focus Queue &amp; Midday Pivot
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Switch sprint focus or add an urgent task. Rule of 3 automatically protects your capacity.
            </p>
          </div>

          {/* Quick add urgent keystone form */}
          <form onSubmit={handleAddUrgentKeystone} className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Urgent pivot task..."
              className="h-9 w-44 sm:w-56 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="h-9 rounded-lg bg-amber-500 px-3 text-xs font-bold text-white hover:bg-amber-600 transition"
              title="Add urgent task and make it today's new Keystone"
            >
              + Pivot
            </button>
          </form>
        </div>

        {/* Task List */}
        <div className="mt-4 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-3 text-center">
              No tasks scheduled for today. Create a task above or visit Morning Launchpad.
            </p>
          ) : (
            tasks.map((task) => {
              const isSelectedForSprint = task.id === activeTaskId;
              return (
                <div
                  key={task.id}
                  className={`relative rounded-xl transition ${
                    isSelectedForSprint ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                >
                  <TaskRow
                    task={task}
                    onStatusChange={(id, status) => handleTaskStatusChange(id, status)}
                    onPriorityChange={handlePromoteToKeystone}
                    onDelete={handleDeleteTask}
                  />
                  {!isSelectedForSprint && task.status !== 'done' && (
                    <button
                      type="button"
                      onClick={() => setActiveTaskId(task.id)}
                      className="absolute right-12 top-3 text-[11px] font-semibold text-primary hover:underline"
                    >
                      Focus Sprint
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Transition CTA to Anchor 3: Evening Shutdown */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Wrapping Up the Day?
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Celebrate micro-wins, reschedule guilt-free, and close open cognitive loops.
          </p>
        </div>

        <Link
          href="/routines/evening"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
        >
          Begin Evening Shutdown &rarr;
        </Link>
      </div>
    </div>
  );
}
