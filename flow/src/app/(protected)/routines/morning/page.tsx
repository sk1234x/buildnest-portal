'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoutineHeader } from '@/components/routines/RoutineHeader';
import { EnergyRating } from '@/components/routines/EnergyRating';
import { KeystoneSelector } from '@/components/routines/KeystoneSelector';
import {
  startRoutineSession,
  createTask,
  updateTaskStatus,
  updateTaskPriority,
  getTasksForDate,
  getSession,
  defaultRoutineService,
} from '@/lib/routines/service';
import { RoutineSession, TaskItem, TaskPriority, TaskStatus, RoutineSlug } from '@/lib/routines/types';

export default function MorningLaunchpadPage() {
  const [today, setToday] = useState('');
  const [session, setSession] = useState<RoutineSession | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const currentDate = new Date().toISOString().split('T')[0];
    setToday(currentDate);

    // Load or start session
    const existing = getSession('morning_launchpad', currentDate);
    const active = existing || startRoutineSession('morning_launchpad', currentDate);
    setSession(active);

    // Load tasks
    const currentTasks = getTasksForDate(currentDate);
    setTasks(currentTasks);
    setMounted(true);
  }, []);

  const handleEnergyChange = (level: number) => {
    if (!today) return;
    const updated = startRoutineSession('morning_launchpad', today, level);
    setSession({ ...updated });
  };

  const handleTaskCreated = (
    title: string,
    priority: TaskPriority,
    estimatedMinutes: number,
    slug: RoutineSlug
  ) => {
    if (!today) return;
    createTask(slug, title, priority, estimatedMinutes, today);
    // Refresh all tasks for date
    setTasks(getTasksForDate(today));
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    if (!today) return;
    updateTaskStatus(taskId, status);
    setTasks(getTasksForDate(today));
  };

  const handlePriorityChange = (taskId: string, priority: TaskPriority) => {
    if (!today) return;
    updateTaskPriority(taskId, priority);
    setTasks(getTasksForDate(today));
  };

  const handleDeleteTask = (taskId: string) => {
    if (!today) return;
    defaultRoutineService.deleteTask(taskId);
    setTasks(getTasksForDate(today));
  };

  if (!mounted || !today) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      {/* Anchor 1 Header */}
      <RoutineHeader
        slug="morning_launchpad"
        sessionDate={today}
        title="Morning Launchpad"
        subtitle="Calibrate energy, set your #1 Keystone focus, and build calm momentum."
        status={session?.status || 'in_progress'}
        energyLevel={session?.energyLevel}
      />

      {/* Nervous System Energy Check-In */}
      <EnergyRating
        value={session?.energyLevel}
        onChange={handleEnergyChange}
      />

      {/* Keystone Focus & Rule of 3 Allocation */}
      <KeystoneSelector
        sessionDate={today}
        routineSlug="morning_launchpad"
        tasks={tasks}
        onTaskCreated={handleTaskCreated}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onDelete={handleDeleteTask}
      />

      {/* Transition CTA to Anchor 2: Day Momentum */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Launchpad Calibrated
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Anchor set. Move to single-task focus sprint when you are ready.
          </p>
        </div>

        <Link
          href="/routines/momentum"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          Open Day Momentum Sprint &rarr;
        </Link>
      </div>
    </div>
  );
}
