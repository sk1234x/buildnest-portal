'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoutineHeader } from '@/components/routines/RoutineHeader';
import { ReflectionForm } from '@/components/routines/ReflectionForm';
import {
  startRoutineSession,
  completeRoutineSession,
  getTasksForDate,
  updateTaskStatus,
  getSession,
} from '@/lib/routines/service';
import { RoutineSession, TaskItem, TaskStatus } from '@/lib/routines/types';

export default function EveningShutdownPage() {
  const [today, setToday] = useState('');
  const [session, setSession] = useState<RoutineSession | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const currentDate = new Date().toISOString().split('T')[0];
    setToday(currentDate);

    // Load or start evening_shutdown session
    const existing = getSession('evening_shutdown', currentDate);
    const active = existing || startRoutineSession('evening_shutdown', currentDate);
    setSession(active);

    const currentTasks = getTasksForDate(currentDate);
    setTasks(currentTasks);
    setMounted(true);
  }, []);

  const handleTaskStatusChange = (taskId: string, status: TaskStatus) => {
    if (!today) return;
    updateTaskStatus(taskId, status);
    setTasks(getTasksForDate(today));
  };

  const handleCompleteShutdown = (notes: string, deferredIds: string[]) => {
    if (!today) return;

    // Defer any explicitly flagged tasks
    for (const id of deferredIds) {
      updateTaskStatus(id, 'deferred');
    }

    // Complete routine session
    const completed = completeRoutineSession('evening_shutdown', today, notes);
    setSession({ ...completed });
    setTasks(getTasksForDate(today));
  };

  if (!mounted || !today) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    );
  }

  const completedTasks = tasks.filter((t) => t.status === 'done');
  const incompleteTasks = tasks.filter((t) => t.status !== 'done');
  const isCompleted = session?.status === 'completed';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      {/* Anchor 3 Header */}
      <RoutineHeader
        slug="evening_shutdown"
        sessionDate={today}
        title="Evening Shutdown"
        subtitle="Celebrate micro-wins, reschedule guilt-free, and detach into rest."
        status={session?.status || 'in_progress'}
      />

      {/* Main Evening Review & Reflection Form */}
      <ReflectionForm
        sessionDate={today}
        completedTasks={completedTasks}
        incompleteTasks={incompleteTasks}
        initialReflectionNotes={session?.reflectionNotes}
        isCompleted={isCompleted}
        onCompleteShutdown={handleCompleteShutdown}
        onTaskStatusChange={handleTaskStatusChange}
      />
    </div>
  );
}
