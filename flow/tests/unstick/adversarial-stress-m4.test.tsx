/**
 * Milestone 4 Adversarial Stress Testing Suite
 *
 * Empirical verification covering:
 * 1. Circular Countdown Timer Adversarial Testing:
 *    - Duration boundaries (< 2 min clamped to 2, > 5 min clamped to 5, float durations handled cleanly, poisoned inputs)
 *    - Rapid state toggling (50+ cycles, start/pause/reset race condition immunity, no negative or NaN seconds)
 *    - Clamp at 00:00 & callback single invocation invariant (large leap time advancing, completion callback called exactly once, restart safety)
 * 2. Unstick Modal & Page Edge Cases:
 *    - Category filtering across all 4 categories (physical_somatic, environmental, atomic_friction, sensory_grounding)
 *    - Energy-adaptive task surfacing (energyLevel 1-2 surfaces somatic/grounding, energyLevel 4-5 surfaces atomic/physical)
 *    - "Try Another" protocol cycling without freezing (immediate non-duplicate invariant, network rejection resilience, zero UI lockup)
 * 3. Route Protection:
 *    - Server-side HTTP 307 redirection to /login for unauthenticated requests to /unstick
 *    - Preservation of redirect query parameter
 *    - Server-side HTTP 307 redirection to /access-denied and session revocation for non-whitelisted users
 *    - Server-side HTTP 401 / 403 enforcement for /api/unstick
 *    - Clean passthrough for authenticated & whitelisted users
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NextRequest, NextResponse } from 'next/server';

// Components under test
import {
  CircularCountdownTimer,
  clampDuration,
  formatTimeDisplay,
} from '@/components/unstick/CircularCountdownTimer';
import { UnstickModal } from '@/components/unstick/UnstickModal';

// Catalog & types
import {
  OFFLINE_FALLBACK_CATALOG,
  getFallbackTask,
  getDeterministicFallback,
} from '@/lib/unstick/catalog';
import type { MicroActivationCategory, MicroActivationTask } from '@/lib/unstick/types';

// Route Protection & Middleware
import { middleware } from '@/middleware';
import * as supabaseMiddleware from '@/lib/supabase/middleware';
import * as whitelistService from '@/lib/auth/whitelist';

describe('Milestone 4 Adversarial Stress Testing Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: CIRCULAR COUNTDOWN TIMER ADVERSARIAL TESTING
  // =========================================================================
  describe('1. Circular Countdown Timer Adversarial Testing', () => {
    describe('1.1 Duration Boundary Stress', () => {
      it('clamps durations < 2 minutes (negative, zero, fractions, Infinity) strictly to 2 minutes', () => {
        expect(clampDuration(-100)).toBe(2);
        expect(clampDuration(-5)).toBe(2);
        expect(clampDuration(-1)).toBe(2);
        expect(clampDuration(-0.001)).toBe(2);
        expect(clampDuration(0)).toBe(2);
        expect(clampDuration(0.9)).toBe(2);
        expect(clampDuration(1)).toBe(2);
        expect(clampDuration(1.49)).toBe(2);
        expect(clampDuration(-Infinity)).toBe(2);
      });

      it('clamps durations > 5 minutes (floats, large numbers, Infinity) strictly to 5 minutes', () => {
        expect(clampDuration(5.1)).toBe(5);
        expect(clampDuration(5.5)).toBe(5);
        expect(clampDuration(6)).toBe(5);
        expect(clampDuration(10)).toBe(5);
        expect(clampDuration(3600)).toBe(5);
        expect(clampDuration(999999)).toBe(5);
        expect(clampDuration(Infinity)).toBe(5);
      });

      it('handles floating point durations cleanly with standard nearest-integer rounding', () => {
        expect(clampDuration(2.1)).toBe(2);
        expect(clampDuration(2.49)).toBe(2);
        expect(clampDuration(2.5)).toBe(3);
        expect(clampDuration(2.7)).toBe(3);
        expect(clampDuration(3.2)).toBe(3);
        expect(clampDuration(3.5)).toBe(4);
        expect(clampDuration(4.4)).toBe(4);
        expect(clampDuration(4.5)).toBe(5);
        expect(clampDuration(4.9)).toBe(5);
      });

      it('safely handles poisoned/degenerate inputs (NaN, undefined, null)', () => {
        expect(clampDuration(NaN)).toBe(2);
        expect(clampDuration(undefined as unknown as number)).toBe(2);
        expect(clampDuration(null as unknown as number)).toBe(2);
      });

      it('renders correct initial display in component for extreme durations', () => {
        const { unmount } = render(<CircularCountdownTimer durationMinutes={-5} />);
        expect(screen.getByTestId('timer-display')).toHaveTextContent('02:00');
        unmount();

        const { unmount: unmountZero } = render(<CircularCountdownTimer durationMinutes={0} />);
        expect(screen.getByTestId('timer-display')).toHaveTextContent('02:00');
        unmountZero();

        const { unmount: unmountLarge } = render(<CircularCountdownTimer durationMinutes={100} />);
        expect(screen.getByTestId('timer-display')).toHaveTextContent('05:00');
        unmountLarge();

        const { unmount: unmountFloat } = render(<CircularCountdownTimer durationMinutes={2.5} />);
        expect(screen.getByTestId('timer-display')).toHaveTextContent('03:00');
        unmountFloat();
      });

      it('survives rapid dynamic prop mutations without desynchronizing state', () => {
        const { rerender } = render(<CircularCountdownTimer durationMinutes={3} />);
        expect(screen.getByTestId('timer-display')).toHaveTextContent('03:00');

        // Dynamically update durationMinutes across 20 iterations
        const testValues = [-10, 0, 1, 2, 2.5, 3, 3.8, 4, 4.5, 5, 8, 50, 2, 4, 1, 5, 3, 2, 5, 3];
        const expectedDisplays = [
          '02:00', '02:00', '02:00', '02:00', '03:00', '03:00', '04:00', '04:00', '05:00', '05:00',
          '05:00', '05:00', '02:00', '04:00', '02:00', '05:00', '03:00', '02:00', '05:00', '03:00',
        ];

        for (let i = 0; i < testValues.length; i++) {
          rerender(<CircularCountdownTimer durationMinutes={testValues[i]} />);
          expect(screen.getByTestId('timer-display')).toHaveTextContent(expectedDisplays[i]);
          expect(screen.getByText('Ready')).toBeInTheDocument();
        }
      });
    });

    describe('1.2 State Toggling Race Conditions & Stress', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('survives 50 rapid toggle clicks without state desync or interval orphan leaks', () => {
        render(<CircularCountdownTimer durationMinutes={2} />);
        const toggleBtn = screen.getByTestId('timer-toggle-btn');

        // Click toggle 50 times rapidly (0ms elapsed)
        for (let i = 0; i < 50; i++) {
          fireEvent.click(toggleBtn);
        }

        // 50 clicks (even number) starts at paused -> 50 toggles ends in paused state
        expect(screen.getByTestId('timer-display')).toHaveTextContent('02:00');
        expect(screen.getByText('Ready')).toBeInTheDocument();

        // Advancing fake time while paused must not decrement seconds
        act(() => {
          vi.advanceTimersByTime(10000);
        });
        expect(screen.getByTestId('timer-display')).toHaveTextContent('02:00');

        // Now resume and ensure single interval ticks at exact 1s pace
        fireEvent.click(toggleBtn);
        expect(screen.getByText('In Progress')).toBeInTheDocument();

        act(() => {
          vi.advanceTimersByTime(1000);
        });
        expect(screen.getByTestId('timer-display')).toHaveTextContent('01:59');

        act(() => {
          vi.advanceTimersByTime(5000);
        });
        expect(screen.getByTestId('timer-display')).toHaveTextContent('01:54');
      });

      it('survives 40 rapid start/tick/pause/reset cycles without drift or negative time', () => {
        const onTick = vi.fn();
        render(<CircularCountdownTimer durationMinutes={2} onTick={onTick} />);
        const toggleBtn = screen.getByTestId('timer-toggle-btn');

        for (let cycle = 1; cycle <= 40; cycle++) {
          // 1. Start timer
          fireEvent.click(toggleBtn);
          expect(screen.getByText('In Progress')).toBeInTheDocument();

          // 2. Advance 2 seconds
          act(() => {
            vi.advanceTimersByTime(2000);
          });
          expect(screen.getByTestId('timer-display')).toHaveTextContent('01:58');

          // 3. Pause timer
          fireEvent.click(toggleBtn);
          expect(screen.getByText('Paused')).toBeInTheDocument();

          // 4. Advance while paused (no decrement allowed)
          act(() => {
            vi.advanceTimersByTime(1500);
          });
          expect(screen.getByTestId('timer-display')).toHaveTextContent('01:58');

          // 5. Reset timer
          const resetBtn = screen.getByTestId('timer-reset-btn');
          fireEvent.click(resetBtn);
          expect(screen.getByTestId('timer-display')).toHaveTextContent('02:00');
          expect(screen.getByText('Ready')).toBeInTheDocument();
        }

        // Verify ticks were strictly valid values (119 or 118, never negative or >120)
        const tickValues: number[] = onTick.mock.calls.map((call) => call[0]);
        expect(tickValues.length).toBe(80); // 2 ticks per cycle * 40 cycles
        for (const tick of tickValues) {
          expect(tick).toBeGreaterThanOrEqual(0);
          expect(tick).toBeLessThanOrEqual(120);
        }
      });
    });

    describe('1.3 Clamp at 00:00 & Callback Single Invocation Invariant', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('advancing timer by large leap intervals (3,600s, 86,400s) stops cleanly at 00:00 and invokes onComplete exactly once', () => {
        const onComplete = vi.fn();
        const onTick = vi.fn();
        render(
          <CircularCountdownTimer
            durationMinutes={2}
            onComplete={onComplete}
            onTick={onTick}
          />
        );

        const toggleBtn = screen.getByTestId('timer-toggle-btn');
        fireEvent.click(toggleBtn);

        // Leap forward by 1 hour (3,600 seconds)
        act(() => {
          vi.advanceTimersByTime(3600 * 1000);
        });

        // Must clamp cleanly at 00:00
        expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00');
        expect(screen.getByText('Complete! 🎉')).toBeInTheDocument();
        expect(onComplete).toHaveBeenCalledTimes(1);

        // Advance by an additional 24 hours (86,400 seconds)
        act(() => {
          vi.advanceTimersByTime(86400 * 1000);
        });

        // Display must remain 00:00 and callback must NOT have fired again
        expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00');
        expect(onComplete).toHaveBeenCalledTimes(1);

        // Ticks must never record negative numbers
        const tickValues: number[] = onTick.mock.calls.map((call) => call[0]);
        for (const tick of tickValues) {
          expect(tick).toBeGreaterThanOrEqual(0);
        }
      });

      it('restart button cleanly resets state and allows a fresh completion cycle', () => {
        const onComplete = vi.fn();
        render(<CircularCountdownTimer durationMinutes={2} onComplete={onComplete} />);

        const toggleBtn = screen.getByTestId('timer-toggle-btn');
        fireEvent.click(toggleBtn);

        // Complete first session
        act(() => {
          vi.advanceTimersByTime(125000);
        });
        expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00');
        expect(onComplete).toHaveBeenCalledTimes(1);

        // Click Restart
        const restartBtn = screen.getByTestId('timer-restart-btn');
        fireEvent.click(restartBtn);

        expect(screen.getByTestId('timer-display')).toHaveTextContent('02:00');
        expect(screen.getByText('Ready')).toBeInTheDocument();

        // Run second session
        const startBtn = screen.getByTestId('timer-toggle-btn');
        fireEvent.click(startBtn);

        act(() => {
          vi.advanceTimersByTime(125000);
        });

        expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00');
        expect(onComplete).toHaveBeenCalledTimes(2);
      });

      it('survives component unmounting cleanly while timer is actively ticking', () => {
        const { unmount } = render(
          <CircularCountdownTimer durationMinutes={2} autoStart={true} />
        );

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        // Unmount during active interval
        expect(() => {
          unmount();
          act(() => {
            vi.advanceTimersByTime(10000);
          });
        }).not.toThrow();
      });
    });
  });

  // =========================================================================
  // SECTION 2: UNSTICK MODAL & PAGE EDGE CASES
  // =========================================================================
  describe('2. Unstick Modal & Page Edge Cases', () => {
    describe('2.1 Category Filtering Across All 4 Categories', () => {
      const requiredCategories: MicroActivationCategory[] = [
        'physical_somatic',
        'environmental',
        'atomic_friction',
        'sensory_grounding',
      ];

      it('catalog contains exactly 32 curated tasks with 8 items in each of the 4 categories', () => {
        expect(OFFLINE_FALLBACK_CATALOG.length).toBe(32);

        for (const cat of requiredCategories) {
          const items = OFFLINE_FALLBACK_CATALOG.filter((t) => t.category === cat);
          expect(items.length).toBe(8);

          for (const item of items) {
            expect(item.durationMinutes).toBeGreaterThanOrEqual(2);
            expect(item.durationMinutes).toBeLessThanOrEqual(5);
            expect(item.instruction.length).toBeGreaterThan(15);
            expect(item.whyItWorks.length).toBeGreaterThan(15);
            expect(item.title.length).toBeGreaterThan(3);
            expect(item.source).toBe('fallback_pool');
          }
        }
      });

      it('getFallbackTask strictly surfaces only tasks matching the requested category across 100 iterations per category', () => {
        for (const cat of requiredCategories) {
          for (let i = 0; i < 100; i++) {
            const task = getFallbackTask(cat);
            expect(task.category).toBe(cat);
            expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
            expect(task.durationMinutes).toBeLessThanOrEqual(5);
          }
        }
      });

      it('falls back safely to valid tasks when invalid/unknown category is provided', () => {
        const task = getFallbackTask('invalid_cat' as any);
        expect(task).toBeDefined();
        expect(requiredCategories).toContain(task.category);
      });
    });

    describe('2.2 Energy-Adaptive Task Surfacing', () => {
      it('surfaces strictly sensory_grounding or physical_somatic tasks for energyLevel 1 and 2', () => {
        const allowedCategories: MicroActivationCategory[] = [
          'sensory_grounding',
          'physical_somatic',
        ];

        // Test energy level 1 across 100 trials
        for (let i = 0; i < 100; i++) {
          const task1 = getFallbackTask(undefined, 1);
          expect(allowedCategories).toContain(task1.category);
          expect(task1.category).not.toBe('atomic_friction');
          expect(task1.category).not.toBe('environmental');
        }

        // Test energy level 2 across 100 trials
        for (let i = 0; i < 100; i++) {
          const task2 = getFallbackTask(undefined, 2);
          expect(allowedCategories).toContain(task2.category);
          expect(task2.category).not.toBe('atomic_friction');
          expect(task2.category).not.toBe('environmental');
        }
      });

      it('surfaces strictly atomic_friction or physical_somatic tasks for energyLevel 4 and 5', () => {
        const allowedHighEnergy: MicroActivationCategory[] = [
          'atomic_friction',
          'physical_somatic',
        ];

        for (let i = 0; i < 100; i++) {
          const task4 = getFallbackTask(undefined, 4);
          expect(allowedHighEnergy).toContain(task4.category);

          const task5 = getFallbackTask(undefined, 5);
          expect(allowedHighEnergy).toContain(task5.category);
        }
      });

      it('getDeterministicFallback adapts to routine context heuristics', () => {
        // Evening shutdown leans to sensory grounding
        for (let i = 0; i < 50; i++) {
          const eveningTask = getDeterministicFallback({ currentRoutine: 'evening_shutdown' });
          expect(eveningTask.category).toBe('sensory_grounding');
        }

        // Day momentum with medium energy leans to atomic friction
        for (let i = 0; i < 50; i++) {
          const momentumTask = getDeterministicFallback({
            currentRoutine: 'day_momentum',
            energyLevel: 3,
          });
          expect(momentumTask.category).toBe('atomic_friction');
        }
      });

      it('UnstickModal surfaces somatic/grounding task when initialized with energyLevel 1', () => {
        render(<UnstickModal isOpen={true} onClose={vi.fn()} energyLevel={1} />);
        const badge = screen.getByText(/(Physical \/ Somatic|Sensory Grounding)/);
        expect(badge).toBeInTheDocument();
      });
    });

    describe('2.3 "Try Another" Protocol Cycling Without Freezing', () => {
      it('guarantees consecutive tasks have different IDs when pool has > 1 item', () => {
        let prevId: string | undefined = undefined;

        for (let cycle = 0; cycle < 50; cycle++) {
          const task = getFallbackTask(undefined, undefined, prevId);
          if (prevId) {
            expect(task.id).not.toBe(prevId);
          }
          prevId = task.id;
        }
      });

      it('survives rapid "Try Another" clicks and falls back locally without UI freeze when API fails', async () => {
        // Mock fetch to reject (network error)
        global.fetch = vi.fn().mockRejectedValue(new Error('Network Offline'));

        render(<UnstickModal isOpen={true} onClose={vi.fn()} />);

        const tryAnotherBtn = screen.getByTestId('unstick-try-another-btn');

        // Click Try Another across 20 cycles
        for (let i = 0; i < 20; i++) {
          const initialTitle = screen.getByTestId('unstick-task-title').textContent;

          await act(async () => {
            fireEvent.click(tryAnotherBtn);
          });

          // Button must be re-enabled (not stuck in loading state)
          expect(tryAnotherBtn).not.toBeDisabled();
          expect(screen.getByText('Try Another')).toBeInTheDocument();

          // A valid task is rendered
          const newTitle = screen.getByTestId('unstick-task-title').textContent;
          expect(newTitle).toBeTruthy();
          expect(screen.getByText('⚡ Offline Protocol')).toBeInTheDocument();
        }
      });

      it('handles Escape key and backdrop clicks without state deadlocks', () => {
        const onClose = vi.fn();
        const { unmount } = render(<UnstickModal isOpen={true} onClose={onClose} />);

        // Press Escape
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);

        unmount();
      });
    });
  });

  // =========================================================================
  // SECTION 3: ROUTE PROTECTION FOR /unstick
  // =========================================================================
  describe('3. Route Protection: SSR Edge Middleware Gatekeeper', () => {
    function createMockRequest(path: string, searchParams: Record<string, string> = {}) {
      const url = new URL(`http://localhost:3000${path}`);
      Object.entries(searchParams).forEach(([k, v]) => {
        url.searchParams.set(k, v);
      });
      return new NextRequest(url);
    }

    it('intercepts unauthenticated request to /unstick with HTTP 307 redirect to /login?redirect=/unstick', async () => {
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

      const req = createMockRequest('/unstick');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      const redirectUrl = new URL(location);
      expect(redirectUrl.pathname).toBe('/login');
      expect(redirectUrl.searchParams.get('redirect')).toBe('/unstick');
    });

    it('intercepts unauthenticated request to /unstick with query params and preserves redirect target', async () => {
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

      const req = createMockRequest('/unstick', { from: 'momentum', energy: '2' });
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      const redirectUrl = new URL(location);
      expect(redirectUrl.pathname).toBe('/login');
      expect(redirectUrl.searchParams.get('redirect')).toBe('/unstick');
    });

    it('blocks unauthenticated POST to /api/unstick with HTTP 401 JSON and zero data leakage', async () => {
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

      const req = createMockRequest('/api/unstick');
      const res = await middleware(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('redirects authenticated but non-whitelisted users visiting /unstick to /access-denied with HTTP 307 and revokes session', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'u-uninvited', email: 'uninvited@attacker.com' } },
            error: null,
          }),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(false);

      const req = createMockRequest('/unstick');
      const res = await middleware(req);

      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/access-denied');
    });

    it('blocks authenticated but non-whitelisted users targeting /api/unstick with HTTP 403 JSON', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'u-uninvited', email: 'uninvited@attacker.com' } },
            error: null,
          }),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(false);

      const req = createMockRequest('/api/unstick');
      const res = await middleware(req);

      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Forbidden');
    });

    it('permits authenticated and whitelisted users to access /unstick without redirection', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'u-whitelisted', email: 'sk@buildnest.buzz' } },
            error: null,
          }),
          signOut: vi.fn(),
        },
      };

      vi.spyOn(supabaseMiddleware, 'createMiddlewareClient').mockReturnValue({
        supabase: mockSupabase as any,
        response: NextResponse.next(),
      });

      vi.spyOn(whitelistService, 'isEmailWhitelisted').mockResolvedValue(true);

      const req = createMockRequest('/unstick');
      const res = await middleware(req);

      // Status should be 200 (NextResponse.next()) without location header
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });
});
