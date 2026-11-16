import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryLocalStorageEngine,
  SupabaseRoutineEngine,
} from '@/lib/routines/storage-adapter';
import { RoutineSession, TaskItem } from '@/lib/routines/types';

describe('Routine Storage Adapter Suite', () => {
  let engine: InMemoryLocalStorageEngine;

  beforeEach(() => {
    engine = new InMemoryLocalStorageEngine();
    engine.resetStore();
  });

  it('stores and retrieves routine sessions in memory', () => {
    const session: RoutineSession = {
      id: 'sess_1',
      userId: 'user-1',
      sessionDate: '2026-11-15',
      routineSlug: 'morning_launchpad',
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      energyLevel: 3,
    };

    engine.saveSession(session);
    const retrieved = engine.getSession('morning_launchpad', '2026-11-15');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('sess_1');
    expect(retrieved?.energyLevel).toBe(3);
  });

  it('returns null for non-existent session', () => {
    const result = engine.getSession('evening_shutdown', '2026-11-15');
    expect(result).toBeNull();
  });

  it('stores, updates, and deletes tasks in memory', () => {
    const task: TaskItem = {
      id: 'task_1',
      userId: 'user-1',
      routineSlug: 'morning_launchpad',
      title: 'Review PRs',
      priority: 'keystone',
      status: 'todo',
      estimatedMinutes: 30,
      sessionDate: '2026-11-15',
    };

    engine.saveTask(task);
    const fetched = engine.getTaskById('task_1');
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Review PRs');

    const tasksForDate = engine.getTasksForDate('2026-11-15');
    expect(tasksForDate).toHaveLength(1);

    // Update
    task.status = 'done';
    engine.updateTasks([task]);
    expect(engine.getTaskById('task_1')?.status).toBe('done');

    // Delete
    engine.deleteTask('task_1');
    expect(engine.getTaskById('task_1')).toBeNull();
    expect(engine.getTasksForDate('2026-11-15')).toHaveLength(0);
  });

  it('clears all sessions and tasks on resetStore', () => {
    engine.saveSession({
      id: 's1',
      userId: 'u1',
      sessionDate: '2026-11-15',
      routineSlug: 'morning_launchpad',
      status: 'in_progress',
    });
    engine.saveTask({
      id: 't1',
      userId: 'u1',
      routineSlug: 'morning_launchpad',
      title: 'Task 1',
      priority: 'keystone',
      status: 'todo',
      estimatedMinutes: 20,
      sessionDate: '2026-11-15',
    });

    engine.resetStore();
    expect(engine.getSession('morning_launchpad', '2026-11-15')).toBeNull();
    expect(engine.getTasksForDate('2026-11-15')).toHaveLength(0);
  });

  it('SupabaseRoutineEngine delegates to fallback when in test environment', async () => {
    const supabaseEngine = new SupabaseRoutineEngine(engine);
    const session: RoutineSession = {
      id: 'sess_fallback',
      userId: 'user-1',
      sessionDate: '2026-11-15',
      routineSlug: 'day_momentum',
      status: 'in_progress',
    };

    await supabaseEngine.saveSession(session);
    const retrieved = await supabaseEngine.getSession('day_momentum', '2026-11-15');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('sess_fallback');
  });
});
