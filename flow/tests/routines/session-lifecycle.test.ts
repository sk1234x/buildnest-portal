import { describe, it, expect, beforeEach } from 'vitest';
import {
  startRoutineSession,
  completeRoutineSession,
  createTask,
  updateTaskStatus,
  getTasksForDate,
  getSession,
  resetStore,
} from '@/lib/routines/service';

describe('Routine Session Lifecycle & Service Facade', () => {
  const date = '2026-11-15';

  beforeEach(() => {
    resetStore();
  });

  describe('startRoutineSession', () => {
    it('initializes morning_launchpad in in_progress state with timestamp', () => {
      const session = startRoutineSession('morning_launchpad', date);
      expect(session.routineSlug).toBe('morning_launchpad');
      expect(session.sessionDate).toBe(date);
      expect(session.status).toBe('in_progress');
      expect(session.startedAt).toBeDefined();
    });

    it('records valid energy level score between 1 and 5', () => {
      const session = startRoutineSession('morning_launchpad', date, 4);
      expect(session.energyLevel).toBe(4);
    });

    it('returns existing session without duplicating ID on repeated start calls (idempotent)', () => {
      const first = startRoutineSession('morning_launchpad', date, 2);
      const second = startRoutineSession('morning_launchpad', date, 5);
      expect(first.id).toBe(second.id);
      expect(second.energyLevel).toBe(5);
    });

    it('starts and tracks day_momentum session', () => {
      const session = startRoutineSession('day_momentum', date);
      expect(session.routineSlug).toBe('day_momentum');
      expect(session.status).toBe('in_progress');
    });

    it('retrieves active session via getSession', () => {
      startRoutineSession('morning_launchpad', date, 3);
      const fetched = getSession('morning_launchpad', date);
      expect(fetched).not.toBeNull();
      expect(fetched?.energyLevel).toBe(3);
    });
  });

  describe('completeRoutineSession', () => {
    it('completes evening_shutdown and records completedAt & reflectionNotes', () => {
      startRoutineSession('evening_shutdown', date);
      const completed = completeRoutineSession(
        'evening_shutdown',
        date,
        'Good progress on keystone task.'
      );
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
      expect(completed.reflectionNotes).toBe('Good progress on keystone task.');
    });

    it('completes cleanly when zero tasks were accomplished that day', () => {
      startRoutineSession('evening_shutdown', date);
      const completed = completeRoutineSession(
        'evening_shutdown',
        date,
        'Zero tasks completed today. Resting.'
      );
      expect(completed.status).toBe('completed');
      expect(completed.reflectionNotes).toContain('Zero tasks');
    });

    it('returns completed session idempotently on repeated calls', () => {
      startRoutineSession('evening_shutdown', date);
      const completed1 = completeRoutineSession('evening_shutdown', date, 'Notes 1');
      const completed2 = completeRoutineSession('evening_shutdown', date, 'Notes 2');
      expect(completed1.id).toBe(completed2.id);
      expect(completed2.status).toBe('completed');
    });

    it('throws error when completing a session that was never started', () => {
      expect(() => completeRoutineSession('evening_shutdown', '2026-11-20')).toThrow(
        'No active session found for evening_shutdown on 2026-11-20'
      );
    });
  });

  describe('Task Operations & Demotion Cascade', () => {
    it('creates keystone task and retrieves via getTasksForDate', () => {
      const task = createTask('morning_launchpad', 'Focus Blueprint', 'keystone', 45, date);
      expect(task.priority).toBe('keystone');
      expect(task.title).toBe('Focus Blueprint');

      const tasks = getTasksForDate(date);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(task.id);
    });

    it('demotes previous keystone to secondary when new keystone is added', () => {
      const k1 = createTask('morning_launchpad', 'First Keystone', 'keystone', 30, date);
      expect(k1.priority).toBe('keystone');

      const k2 = createTask('morning_launchpad', 'Second Keystone', 'keystone', 60, date);
      expect(k2.priority).toBe('keystone');

      const tasks = getTasksForDate(date);
      const foundK1 = tasks.find((t) => t.id === k1.id);
      expect(foundK1?.priority).toBe('secondary');
    });

    it('transitions task status through todo -> in_progress -> done', () => {
      const task = createTask('day_momentum', 'Coding Sprint', 'keystone', 25, date);
      expect(task.status).toBe('todo');

      const inProg = updateTaskStatus(task.id, 'in_progress');
      expect(inProg.status).toBe('in_progress');

      const done = updateTaskStatus(task.id, 'done', 24);
      expect(done.status).toBe('done');
      expect(done.actualMinutes).toBe(24);
    });

    it('throws error when updating non-existent task ID', () => {
      expect(() => updateTaskStatus('non-existent-id', 'done')).toThrow(
        'Task with ID non-existent-id not found'
      );
    });
  });
});
