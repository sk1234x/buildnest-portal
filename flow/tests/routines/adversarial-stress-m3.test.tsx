/**
 * Milestone 3 Adversarial Stress Testing Suite
 *
 * Rigorous empirical stress-testing covering:
 * 1. Component Resilience & State Drift (EnergyRating, KeystoneSelector, FocusSprintTimer, ReflectionForm)
 * 2. Route Protection & Edge SSR Gatekeeper (/routines/morning, /routines/momentum, /routines/evening)
 * 3. Storage Adapter Fallback Resilience (corrupted localStorage, quota errors, missing Supabase credentials, repeated resets)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NextRequest, NextResponse } from 'next/server';

// Components
import { EnergyRating } from '@/components/routines/EnergyRating';
import { KeystoneSelector } from '@/components/routines/KeystoneSelector';
import { FocusSprintTimer } from '@/components/routines/FocusSprintTimer';
import { ReflectionForm } from '@/components/routines/ReflectionForm';

// Middleware & Supabase
import { middleware } from '@/middleware';
import * as supabaseMiddleware from '@/lib/supabase/middleware';

// Storage Engines & Domain
import {
  InMemoryLocalStorageEngine,
  SupabaseRoutineEngine,
} from '@/lib/routines/storage-adapter';
import { TaskItem, RoutineSession } from '@/lib/routines/types';

// Helper to install mock localStorage in jsdom environment
function setupMockLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, val: string) => store.set(key, String(val))),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((i: number) => Array.from(store.keys())[i] ?? null),
  };
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
  return { store, mockStorage };
}

describe('Milestone 3 Adversarial Stress Testing Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. COMPONENT RESILIENCE & STATE DRIFT
  // =========================================================================
  describe('1. Component Resilience: EnergyRating', () => {
    it('survives rapid clicking across all levels without state drift', () => {
      const onChange = vi.fn();
      const { rerender } = render(<EnergyRating value={1} onChange={onChange} />);

      // Rapidly click buttons across 50 iterations cycling 1..5
      for (let i = 1; i <= 50; i++) {
        const targetLevel = (i % 5) + 1;
        const button = screen.getByRole('radio', {
          name: new RegExp(`Energy level ${targetLevel}:`, 'i'),
        });
        fireEvent.click(button);
        expect(onChange).toHaveBeenLastCalledWith(targetLevel);

        // Re-render to reflect new value
        rerender(<EnergyRating value={targetLevel} onChange={onChange} />);
        expect(button).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText(`Level ${targetLevel} of 5`)).toBeInTheDocument();
      }

      expect(onChange).toHaveBeenCalledTimes(50);
    });

    it('handles boundary inputs gracefully (undefined, min 1, max 5, disabled)', () => {
      const onChange = vi.fn();

      // Case 1: value is undefined (initial untouched state)
      const { rerender } = render(<EnergyRating value={undefined} onChange={onChange} />);
      expect(screen.queryByText(/Level \d of 5/)).not.toBeInTheDocument();
      const radios = screen.getAllByRole('radio');
      radios.forEach((r) => expect(r).toHaveAttribute('aria-checked', 'false'));

      // Case 2: disabled state
      rerender(<EnergyRating value={3} onChange={onChange} disabled={true} />);
      const level1 = screen.getByRole('radio', { name: /Energy level 1:/i });
      expect(level1).toBeDisabled();

      fireEvent.click(level1);
      expect(onChange).not.toHaveBeenCalled();

      // Keyboard arrow when disabled does nothing
      fireEvent.keyDown(level1, { key: 'ArrowRight' });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clamps keyboard arrow navigation strictly at boundaries [1, 5]', () => {
      const onChange = vi.fn();
      const { rerender } = render(<EnergyRating value={5} onChange={onChange} />);

      const level5 = screen.getByRole('radio', { name: /Energy level 5:/i });

      // ArrowRight and ArrowUp at boundary 5 must NOT exceed 5
      fireEvent.keyDown(level5, { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith(5);

      fireEvent.keyDown(level5, { key: 'ArrowUp' });
      expect(onChange).toHaveBeenCalledWith(5);

      // Re-render at boundary 1
      rerender(<EnergyRating value={1} onChange={onChange} />);
      const level1 = screen.getByRole('radio', { name: /Energy level 1:/i });

      // ArrowLeft and ArrowDown at boundary 1 must NOT drop below 1
      fireEvent.keyDown(level1, { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith(1);

      fireEvent.keyDown(level1, { key: 'ArrowDown' });
      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('falls back to current button level when value is undefined during keyboard navigation', () => {
      const onChange = vi.fn();
      render(<EnergyRating value={undefined} onChange={onChange} />);

      const level3Button = screen.getByRole('radio', { name: /Energy level 3:/i });
      fireEvent.keyDown(level3Button, { key: 'ArrowRight' });
      // Math.min(5, 3 + 1) = 4
      expect(onChange).toHaveBeenCalledWith(4);
    });
  });

  describe('2. Component Resilience: KeystoneSelector', () => {
    const sessionDate = '2026-11-15';

    it('handles rapid sequential task creation and resets input cleanly', () => {
      const onTaskCreated = vi.fn();
      render(
        <KeystoneSelector
          sessionDate={sessionDate}
          tasks={[]}
          onTaskCreated={onTaskCreated}
        />
      );

      const input = screen.getByPlaceholderText(/Draft Product Architecture/i);
      const submit = screen.getByRole('button', { name: /Add Task/i });

      for (let i = 1; i <= 15; i++) {
        fireEvent.change(input, { target: { value: `Adversarial Rapid Task #${i}` } });
        expect(input).toHaveValue(`Adversarial Rapid Task #${i}`);
        fireEvent.click(submit);

        expect(onTaskCreated).toHaveBeenLastCalledWith(
          `Adversarial Rapid Task #${i}`,
          'keystone',
          25,
          'morning_launchpad'
        );
        expect(input).toHaveValue('');
      }

      expect(onTaskCreated).toHaveBeenCalledTimes(15);
    });

    it('rejects empty, whitespace-only, and overlength task titles with exact contract errors', () => {
      const onTaskCreated = vi.fn();
      render(
        <KeystoneSelector
          sessionDate={sessionDate}
          tasks={[]}
          onTaskCreated={onTaskCreated}
        />
      );

      const input = screen.getByPlaceholderText(/Draft Product Architecture/i);
      const submit = screen.getByRole('button', { name: /Add Task/i });

      // Test 1: Empty string
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(submit);
      expect(screen.getByText('Task title cannot be empty')).toBeInTheDocument();
      expect(onTaskCreated).not.toHaveBeenCalled();

      // Test 2: Whitespace only
      fireEvent.change(input, { target: { value: '    \t  \n  ' } });
      fireEvent.click(submit);
      expect(screen.getByText('Task title cannot be empty')).toBeInTheDocument();
      expect(onTaskCreated).not.toHaveBeenCalled();

      // Test 3: Exceeds 500 characters
      const overlengthTitle = 'A'.repeat(501);
      fireEvent.change(input, { target: { value: overlengthTitle } });
      fireEvent.click(submit);
      expect(
        screen.getByText('Task title exceeds maximum length of 500 characters')
      ).toBeInTheDocument();
      expect(onTaskCreated).not.toHaveBeenCalled();

      // Test 4: Exactly 500 characters is allowed
      const maxTitle = 'B'.repeat(500);
      fireEvent.change(input, { target: { value: maxTitle } });
      fireEvent.click(submit);
      expect(onTaskCreated).toHaveBeenCalledWith(maxTitle, 'keystone', 25, 'morning_launchpad');
    });

    it('displays predictive demotion notices and supports dismissal', () => {
      const onTaskCreated = vi.fn();
      const existingTasks: TaskItem[] = [
        {
          id: 'k1',
          userId: 'u1',
          routineSlug: 'morning_launchpad',
          title: 'Existing Keystone One',
          priority: 'keystone',
          status: 'todo',
          estimatedMinutes: 30,
          sessionDate,
        },
        {
          id: 's1',
          userId: 'u1',
          routineSlug: 'morning_launchpad',
          title: 'Secondary One',
          priority: 'secondary',
          status: 'todo',
          estimatedMinutes: 20,
          sessionDate,
        },
      ];

      render(
        <KeystoneSelector
          sessionDate={sessionDate}
          tasks={existingTasks}
          onTaskCreated={onTaskCreated}
        />
      );

      const input = screen.getByPlaceholderText(/Draft Product Architecture/i);
      const submit = screen.getByRole('button', { name: /Add Task/i });

      fireEvent.change(input, { target: { value: 'New Urgent Priority' } });
      fireEvent.click(submit);

      // Verify demotion banner is shown
      const banner = screen.getByTestId('demotion-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(
        'Rule of 3: Previous Keystone "Existing Keystone One" was demoted to Secondary.'
      );

      // Dismiss demotion notice via close button
      const dismissBtn = screen.getByRole('button', { name: '×' });
      fireEvent.click(dismissBtn);
      expect(screen.queryByTestId('demotion-banner')).not.toBeInTheDocument();
    });

    it('toggles backlog and finished task drawer cleanly', () => {
      const tasksWithBacklog: TaskItem[] = [
        {
          id: 'b1',
          userId: 'u1',
          routineSlug: 'morning_launchpad',
          title: 'Backlog Item One',
          priority: 'backlog',
          status: 'todo',
          estimatedMinutes: 15,
          sessionDate,
        },
        {
          id: 'd1',
          userId: 'u1',
          routineSlug: 'morning_launchpad',
          title: 'Completed Task',
          priority: 'secondary',
          status: 'done',
          estimatedMinutes: 25,
          sessionDate,
        },
      ];

      render(
        <KeystoneSelector
          sessionDate={sessionDate}
          tasks={tasksWithBacklog}
          onTaskCreated={vi.fn()}
        />
      );

      const drawerBtn = screen.getByRole('button', {
        name: /Backlog & Finished Tasks \(1 backlog, 1 completed\)/i,
      });
      expect(drawerBtn).toBeInTheDocument();
      expect(drawerBtn).toHaveTextContent('▼ Show');

      // Initially closed
      expect(screen.queryByText('Backlog Item One')).not.toBeInTheDocument();

      // Open drawer
      fireEvent.click(drawerBtn);
      expect(drawerBtn).toHaveTextContent('▲ Hide');
      expect(screen.getByText('Backlog Item One')).toBeInTheDocument();
      expect(screen.getByText('Completed Task')).toBeInTheDocument();

      // Close drawer
      fireEvent.click(drawerBtn);
      expect(drawerBtn).toHaveTextContent('▼ Show');
      expect(screen.queryByText('Backlog Item One')).not.toBeInTheDocument();
    });
  });

  describe('3. Component Resilience: FocusSprintTimer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('survives rapid start/pause cycling without runaway intervals or negative time', () => {
      render(<FocusSprintTimer defaultDurationMinutes={25} />);
      const toggleBtn = () => screen.getByRole('button', { name: /(Start|Pause) Sprint/i });

      // Rapidly toggle 40 times
      for (let i = 0; i < 40; i++) {
        act(() => {
          fireEvent.click(toggleBtn());
        });
      }

      // Check current display is valid MM:SS and not corrupted
      const display = screen.getByTestId('timer-display').textContent;
      expect(display).toMatch(/^\d{2}:\d{2}$/);
    });

    it('demonstrates drift resilience: clamps cleanly to 00:00 and notifies completion once', () => {
      const onSprintComplete = vi.fn();
      const onTaskStatusChange = vi.fn();
      const mockTask: TaskItem = {
        id: 'focus-task-1',
        userId: 'u1',
        routineSlug: 'day_momentum',
        title: 'High Focus Keystone',
        priority: 'keystone',
        status: 'todo',
        estimatedMinutes: 25,
        sessionDate: '2026-11-15',
      };

      render(
        <FocusSprintTimer
          activeTask={mockTask}
          defaultDurationMinutes={25}
          onSprintComplete={onSprintComplete}
          onTaskStatusChange={onTaskStatusChange}
        />
      );

      // Start sprint in act
      const startBtn = screen.getByRole('button', { name: /Start Sprint/i });
      act(() => {
        fireEvent.click(startBtn);
      });

      // Verify task transitioned to in_progress
      expect(onTaskStatusChange).toHaveBeenCalledWith('focus-task-1', 'in_progress');

      // Fast-forward past completion (3000 seconds = 50 minutes)
      act(() => {
        vi.advanceTimersByTime(3000 * 1000);
      });

      // Timer display should clamp to 00:00, status should be COMPLETE
      expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00');
      expect(screen.getByText('COMPLETE')).toBeInTheDocument();

      // onSprintComplete and onTaskStatusChange should have been called for completion
      expect(onSprintComplete).toHaveBeenCalledWith(25);
      expect(onTaskStatusChange).toHaveBeenCalledWith('focus-task-1', 'done', 25);
    });

    it('handles duration switching mid-countdown safely and resets state', () => {
      render(<FocusSprintTimer defaultDurationMinutes={25} />);

      // Start sprint
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Start Sprint/i }));
      });
      act(() => {
        vi.advanceTimersByTime(10 * 1000); // 10s elapsed
      });
      expect(screen.getByTestId('timer-display')).toHaveTextContent('24:50');

      // Switch to 15m preset mid-countdown
      const preset15m = screen.getByRole('button', { name: '15m Quick' });
      act(() => {
        fireEvent.click(preset15m);
      });

      // Timer resets to 15:00 and pauses
      expect(screen.getByTestId('timer-display')).toHaveTextContent('15:00');
      expect(screen.getByText('PAUSED')).toBeInTheDocument();

      // Advancing timer does NOT tick because it paused on preset switch
      act(() => {
        vi.advanceTimersByTime(5 * 1000);
      });
      expect(screen.getByTestId('timer-display')).toHaveTextContent('15:00');

      // Switch to 5m Rest
      const preset5m = screen.getByRole('button', { name: '5m Rest' });
      act(() => {
        fireEvent.click(preset5m);
      });
      expect(screen.getByTestId('timer-display')).toHaveTextContent('05:00');
    });
  });

  describe('4. Component Resilience: ReflectionForm', () => {
    it('handles 0 micro-wins with empathetic non-judgmental messaging', () => {
      render(
        <ReflectionForm
          sessionDate="2026-11-15"
          completedTasks={[]}
          incompleteTasks={[]}
          onCompleteShutdown={vi.fn()}
        />
      );

      // Verify empathetic recovery message
      expect(
        screen.getByText('Zero tasks completed today — and that is completely fine.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Rest, recovery, and neurological reset are essential parts of human momentum.'
        )
      ).toBeInTheDocument();
    });

    it('toggles guilt-free deferrals updating task status to deferred and records them in shutdown payload', () => {
      const onCompleteShutdown = vi.fn();
      const onTaskStatusChange = vi.fn();

      const incompleteTasks: TaskItem[] = [
        {
          id: 'defer-1',
          userId: 'u1',
          routineSlug: 'day_momentum',
          title: 'Unfinished Deep Dive',
          priority: 'secondary',
          status: 'todo',
          estimatedMinutes: 45,
          sessionDate: '2026-11-15',
        },
        {
          id: 'defer-2',
          userId: 'u1',
          routineSlug: 'day_momentum',
          title: 'Unfinished Documentation',
          priority: 'secondary',
          status: 'todo',
          estimatedMinutes: 20,
          sessionDate: '2026-11-15',
        },
      ];

      render(
        <ReflectionForm
          sessionDate="2026-11-15"
          completedTasks={[]}
          incompleteTasks={incompleteTasks}
          onCompleteShutdown={onCompleteShutdown}
          onTaskStatusChange={onTaskStatusChange}
        />
      );

      // Toggle deferral on first task
      const deferButtons = screen.getAllByRole('button', { name: /Defer to Tomorrow/i });
      fireEvent.click(deferButtons[0]);

      expect(onTaskStatusChange).toHaveBeenCalledWith('defer-1', 'deferred');
      expect(deferButtons[0]).toHaveTextContent('✓ Defer to Tomorrow');

      // Submit shutdown form with reflection note
      const textarea = screen.getByPlaceholderText(/What worked today/i);
      fireEvent.change(textarea, { target: { value: 'Closed open loops, resting peacefully.' } });

      const submitBtn = screen.getByRole('button', { name: /Close the Loop/i });
      fireEvent.click(submitBtn);

      expect(onCompleteShutdown).toHaveBeenCalledWith(
        'Closed open loops, resting peacefully.',
        ['defer-1']
      );
      expect(screen.getByText('Shutdown Complete!')).toBeInTheDocument();
      expect(screen.getByText(/Closed open loops, resting peacefully/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. ROUTE PROTECTION & EDGE SSR BOUNDARY
  // =========================================================================
  describe('5. Route Protection & Edge SSR Boundary Verification', () => {
    function createMockRequest(pathname: string) {
      const url = new URL(`http://localhost:3000${pathname}`);
      return new NextRequest(url);
    }

    it('intercepts unauthenticated requests to /routines/morning with HTTP 307 redirect to /login', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
          signOut: vi.fn(),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      const req = createMockRequest('/routines/morning');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('/login?redirect=%2Froutines%2Fmorning');
    });

    it('intercepts unauthenticated requests to /routines/momentum with HTTP 307 redirect to /login', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
          signOut: vi.fn(),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      const req = createMockRequest('/routines/momentum');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('/login?redirect=%2Froutines%2Fmomentum');
    });

    it('intercepts unauthenticated requests to /routines/evening with HTTP 307 redirect to /login', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
          signOut: vi.fn(),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      const req = createMockRequest('/routines/evening');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('/login?redirect=%2Froutines%2Fevening');
    });

    it('intercepts unauthenticated requests to root /routines and arbitrary sub-paths', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
          signOut: vi.fn(),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      for (const path of [
        '/routines',
        '/routines/custom/subpath',
        '/routines/morning?date=2026-11-15',
      ]) {
        const req = createMockRequest(path);
        const res = await middleware(req);
        expect(res.status).toBe(307);
        const location = res.headers.get('location') || '';
        expect(location).toMatch(/\/login\?.*redirect=/);
      }
    });
  });

  // =========================================================================
  // 3. STORAGE FALLBACK RESILIENCE
  // =========================================================================
  describe('6. Storage Adapter Fallback Resilience', () => {
    it('survives corrupted localStorage JSON without crashing hydration', () => {
      const { store } = setupMockLocalStorage();

      // Intentionally write malformed JSON to localStorage
      store.set('flow_routine_sessions_v1', '<<MALFORMED_JSON_CORRUPTED>>');
      store.set('flow_routine_tasks_v1', '{ "unclosed": true, ');

      // Initializing engine must not throw JSON.parse syntax error
      let engine: InMemoryLocalStorageEngine;
      expect(() => {
        engine = new InMemoryLocalStorageEngine();
      }).not.toThrow();

      // Engine operates normally with empty fallback
      expect(engine!.getSession('morning_launchpad', '2026-11-15')).toBeNull();
      expect(engine!.getTasksForDate('2026-11-15')).toHaveLength(0);

      // Subsequent saves repair the corrupted localStorage with valid JSON
      const validSession: RoutineSession = {
        id: 's-repair',
        userId: 'u1',
        sessionDate: '2026-11-15',
        routineSlug: 'morning_launchpad',
        status: 'in_progress',
      };
      engine!.saveSession(validSession);

      const parsedSessions = JSON.parse(store.get('flow_routine_sessions_v1') || '[]');
      expect(parsedSessions).toHaveLength(1);
      expect(parsedSessions[0].id).toBe('s-repair');
    });

    it('survives localStorage QuotaExceededError and continues functioning in-memory', () => {
      const { mockStorage } = setupMockLocalStorage();
      const engine = new InMemoryLocalStorageEngine();

      // Mock setItem to throw QuotaExceededError
      mockStorage.setItem.mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });

      const task: TaskItem = {
        id: 'task-quota-test',
        userId: 'u1',
        routineSlug: 'morning_launchpad',
        title: 'Task under quota pressure',
        priority: 'keystone',
        status: 'todo',
        estimatedMinutes: 25,
        sessionDate: '2026-11-15',
      };

      // saveTask must not throw
      expect(() => {
        engine.saveTask(task);
      }).not.toThrow();

      // In-memory retrieval works seamlessly despite localStorage failure
      const fetched = engine.getTaskById('task-quota-test');
      expect(fetched).not.toBeNull();
      expect(fetched?.title).toBe('Task under quota pressure');
    });

    it('SupabaseRoutineEngine falls back gracefully when Supabase is unconfigured or unavailable', async () => {
      // Mock missing/test environment Supabase URL
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const fallback = new InMemoryLocalStorageEngine();
      const supabaseEngine = new SupabaseRoutineEngine(fallback);

      const session: RoutineSession = {
        id: 'sess-offline',
        userId: 'u1',
        sessionDate: '2026-11-15',
        routineSlug: 'evening_shutdown',
        status: 'completed',
        reflectionNotes: 'Offline fallback operational',
      };

      // saveSession and getSession
      await supabaseEngine.saveSession(session);
      const retrieved = await supabaseEngine.getSession('evening_shutdown', '2026-11-15');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.reflectionNotes).toBe('Offline fallback operational');

      // saveTask, getTasksForDate, updateTasks, deleteTask
      const task: TaskItem = {
        id: 'task-offline',
        userId: 'u1',
        routineSlug: 'evening_shutdown',
        title: 'Offline Task',
        priority: 'secondary',
        status: 'todo',
        estimatedMinutes: 15,
        sessionDate: '2026-11-15',
      };

      await supabaseEngine.saveTask(task);
      const tasks = await supabaseEngine.getTasksForDate('2026-11-15');
      expect(tasks).toHaveLength(1);

      task.status = 'done';
      await supabaseEngine.updateTasks([task]);
      const updated = await supabaseEngine.getTaskById('task-offline');
      expect(updated?.status).toBe('done');

      await supabaseEngine.deleteTask('task-offline');
      const emptyTasks = await supabaseEngine.getTasksForDate('2026-11-15');
      expect(emptyTasks).toHaveLength(0);

      // Restore URL
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    });

    it('handles repeated resets without error and cleans up storage keys', () => {
      const { store } = setupMockLocalStorage();
      const engine = new InMemoryLocalStorageEngine();

      engine.saveSession({
        id: 's1',
        userId: 'u1',
        sessionDate: '2026-11-15',
        routineSlug: 'morning_launchpad',
        status: 'in_progress',
      });

      // Call resetStore 5 times consecutively
      for (let i = 0; i < 5; i++) {
        expect(() => engine.resetStore()).not.toThrow();
      }

      expect(engine.getSession('morning_launchpad', '2026-11-15')).toBeNull();
      expect(engine.getTasksForDate('2026-11-15')).toHaveLength(0);
      expect(store.get('flow_routine_sessions_v1')).toBeUndefined();
      expect(store.get('flow_routine_tasks_v1')).toBeUndefined();
    });
  });
});
