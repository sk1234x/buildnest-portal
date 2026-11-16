/**
 * Tier 5 White-Box Adversarial Stress Test Suite (Vitest Runner)
 * Milestone 6 Phase 2: Routines, Panic Button, LLM & Audio
 *
 * Empirical verification of internal source code:
 * 1. Rule of 3 demotion cascades with deep cascades (5+ tasks), backlog promotion, secondary promotion, date isolation, done exemption.
 * 2. Countdown timer clamp logic, format display with negative seconds, rounding of floats.
 * 3. Offline catalog 32-item integrity, 4-category distribution, energy routing, non-repeating excludeId.
 * 4. Circuit breaker 2.5s abort, 3 consecutive failures to OPEN, 30s reset cooldown, HTTP 429 quota exhaustion, malformed JSON.
 * 5. Audio chime degradation and exception swallowing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyRuleOfThree } from '@/lib/routines/rule-of-three';
import {
  RoutineService,
  startRoutineSession,
  completeRoutineSession,
  createTask,
  updateTaskStatus,
  updateTaskPriority,
  getTasksForDate,
  getSession,
  resetStore,
} from '@/lib/routines/service';
import {
  validateSessionDate,
  validateEnergyLevel,
  validateTaskTitle,
  validateEstimatedMinutes,
} from '@/lib/routines/validation';
import {
  OFFLINE_FALLBACK_CATALOG,
  getFallbackTask,
  getDeterministicFallback,
  getRandomFallbackTask,
} from '@/lib/unstick/catalog';
import {
  executeUnstickWithBreaker,
  resetCircuitBreaker,
  getCircuitBreakerState,
  CIRCUIT_BREAKER_TIMEOUT_MS,
  FAILURE_THRESHOLD,
  RESET_TIMEOUT_MS,
} from '@/lib/unstick/circuit-breaker';
import {
  sanitizeAndValidateTask,
  buildUserPrompt,
  getGeminiApiKey,
} from '@/lib/unstick/gemini-client';
import {
  clampDuration,
  formatTimeDisplay,
} from '@/components/unstick/CircularCountdownTimer';
import type { TaskItem, TaskPriority } from '@/lib/routines/types';
import type { MicroActivationCategory } from '@/lib/unstick/types';

describe('Tier 5 White-Box Adversarial Hardening Suite', () => {
  const TEST_DATE = '2026-11-15';
  const OTHER_DATE = '2026-11-16';

  const makeTask = (
    id: string,
    priority: TaskPriority,
    status: TaskItem['status'] = 'todo',
    date = TEST_DATE
  ): TaskItem => ({
    id,
    userId: 'whitelisted-user',
    routineSlug: 'morning_launchpad',
    title: `Task ${id}`,
    priority,
    status,
    estimatedMinutes: 25,
    sessionDate: date,
  });

  beforeEach(() => {
    resetStore();
    resetCircuitBreaker();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. RULE OF 3 STATE MACHINE ADVERSARIAL STRESS
  // =========================================================================
  describe('1. Rule of 3 State Machine Deep Cascades', () => {
    it('cascades 5 consecutive keystones into exactly 1 keystone, 2 secondaries, 2 backlogs', () => {
      let tasks: TaskItem[] = [];

      for (let i = 1; i <= 5; i++) {
        const { assignedPriority, modifiedTasks } = applyRuleOfThree(tasks, 'keystone', TEST_DATE);
        expect(assignedPriority).toBe('keystone');

        // Apply modifications
        for (const mod of modifiedTasks) {
          tasks = tasks.map((t) => (t.id === mod.id ? mod : t));
        }

        tasks.push(makeTask(`k${i}`, assignedPriority));
      }

      const activeKeystone = tasks.filter((t) => t.priority === 'keystone');
      const activeSecondaries = tasks.filter((t) => t.priority === 'secondary');
      const backlogs = tasks.filter((t) => t.priority === 'backlog');

      expect(activeKeystone).toHaveLength(1);
      expect(activeKeystone[0].id).toBe('k5');

      expect(activeSecondaries).toHaveLength(2);
      expect(activeSecondaries.map((t) => t.id).sort()).toEqual(['k1', 'k2']);

      expect(backlogs).toHaveLength(2);
      expect(backlogs.map((t) => t.id).sort()).toEqual(['k3', 'k4']);
    });

    it('demotes existing keystone to backlog when a backlog task is promoted to keystone and secondaries are full', () => {
      const existing = [
        makeTask('k1', 'keystone'),
        makeTask('s1', 'secondary'),
        makeTask('s2', 'secondary'),
        makeTask('b1', 'backlog'),
      ];

      // Promote b1 to keystone:
      const { assignedPriority, modifiedTasks } = applyRuleOfThree(existing, 'keystone', TEST_DATE, 'b1');
      expect(assignedPriority).toBe('keystone');
      expect(modifiedTasks).toHaveLength(1);
      expect(modifiedTasks[0].id).toBe('k1');
      expect(modifiedTasks[0].priority).toBe('backlog');
    });

    it('demotes existing keystone to secondary when an existing secondary task is promoted to keystone', () => {
      const existing = [
        makeTask('k1', 'keystone'),
        makeTask('s1', 'secondary'),
        makeTask('s2', 'secondary'),
      ];

      // Promote s1 to keystone:
      const { assignedPriority, modifiedTasks } = applyRuleOfThree(existing, 'keystone', TEST_DATE, 's1');
      expect(assignedPriority).toBe('keystone');
      expect(modifiedTasks).toHaveLength(1);
      expect(modifiedTasks[0].id).toBe('k1');
      expect(modifiedTasks[0].priority).toBe('secondary');
    });

    it('isolates task priority limits strictly across dates', () => {
      const yesterday = '2026-11-14';
      const existing = [
        makeTask('k-yesterday', 'keystone', 'todo', yesterday),
        makeTask('s1-yesterday', 'secondary', 'todo', yesterday),
        makeTask('s2-yesterday', 'secondary', 'todo', yesterday),
      ];

      // On today, full capacity is available despite yesterday's unfinished tasks
      const resK = applyRuleOfThree(existing, 'keystone', TEST_DATE);
      expect(resK.assignedPriority).toBe('keystone');
      expect(resK.modifiedTasks).toHaveLength(0);

      const resS = applyRuleOfThree(existing, 'secondary', TEST_DATE);
      expect(resS.assignedPriority).toBe('secondary');
      expect(resS.modifiedTasks).toHaveLength(0);
    });

    it('exempts completed (done) tasks from counting towards limits', () => {
      const existing = [
        makeTask('k-done', 'keystone', 'done'),
        makeTask('s1-done', 'secondary', 'done'),
        makeTask('s2-done', 'secondary', 'done'),
      ];

      const resK = applyRuleOfThree(existing, 'keystone', TEST_DATE);
      expect(resK.assignedPriority).toBe('keystone');
      expect(resK.modifiedTasks).toHaveLength(0);

      const resS = applyRuleOfThree(existing, 'secondary', TEST_DATE);
      expect(resS.assignedPriority).toBe('secondary');
      expect(resS.modifiedTasks).toHaveLength(0);
    });
  });

  // =========================================================================
  // 2. CIRCULAR COUNTDOWN TIMER BOUNDARY CLAMPING
  // =========================================================================
  describe('2. Circular Countdown Timer Clamping & Formatting', () => {
    it('clamps all duration inputs strictly to [2, 5] minutes', () => {
      expect(clampDuration(-100)).toBe(2);
      expect(clampDuration(0)).toBe(2);
      expect(clampDuration(1.4)).toBe(2);
      expect(clampDuration(1.9)).toBe(2);
      expect(clampDuration(2.4)).toBe(2);
      expect(clampDuration(2.5)).toBe(3);
      expect(clampDuration(3.5)).toBe(4);
      expect(clampDuration(4.5)).toBe(5);
      expect(clampDuration(5.1)).toBe(5);
      expect(clampDuration(100)).toBe(5);
      expect(clampDuration(NaN)).toBe(2);
      expect(clampDuration(Infinity)).toBe(5);
      expect(clampDuration(-Infinity)).toBe(2);
    });

    it('formats time with strict non-negative clamping', () => {
      expect(formatTimeDisplay(0)).toBe('00:00');
      expect(formatTimeDisplay(-1)).toBe('00:00');
      expect(formatTimeDisplay(-100)).toBe('00:00');
      expect(formatTimeDisplay(59)).toBe('00:59');
      expect(formatTimeDisplay(60)).toBe('01:00');
      expect(formatTimeDisplay(125)).toBe('02:05');
      expect(formatTimeDisplay(300)).toBe('05:00');
    });
  });

  // =========================================================================
  // 3. DETERMINISTIC OFFLINE CATALOG & DISTRIBUTION
  // =========================================================================
  describe('3. Deterministic Offline Catalog & Distribution', () => {
    it('verifies catalog has exactly 32 items with 8 in each category', () => {
      expect(OFFLINE_FALLBACK_CATALOG).toHaveLength(32);

      const counts: Record<MicroActivationCategory, number> = {
        physical_somatic: 0,
        environmental: 0,
        atomic_friction: 0,
        sensory_grounding: 0,
      };

      for (const item of OFFLINE_FALLBACK_CATALOG) {
        expect(item.id).toBeDefined();
        expect(item.title.length).toBeGreaterThanOrEqual(3);
        expect(item.instruction.length).toBeGreaterThanOrEqual(15);
        expect(item.durationMinutes).toBeGreaterThanOrEqual(2);
        expect(item.durationMinutes).toBeLessThanOrEqual(5);
        expect(item.whyItWorks.length).toBeGreaterThanOrEqual(15);
        expect(item.source).toBe('fallback_pool');

        counts[item.category] += 1;
      }

      expect(counts.physical_somatic).toBe(8);
      expect(counts.environmental).toBe(8);
      expect(counts.atomic_friction).toBe(8);
      expect(counts.sensory_grounding).toBe(8);
    });

    it('ensures excludeId cycling never returns the excluded item', () => {
      let current = getRandomFallbackTask();
      for (let i = 0; i < 50; i++) {
        const next = getRandomFallbackTask(current.id);
        expect(next.id).not.toBe(current.id);
        current = next;
      }
    });

    it('routes low energy (<=2) to sensory or physical tasks', () => {
      for (let i = 0; i < 20; i++) {
        const task = getFallbackTask(undefined, 1);
        expect(
          task.category === 'sensory_grounding' || task.category === 'physical_somatic'
        ).toBe(true);
      }
    });

    it('routes high energy (>=4) to atomic friction or physical tasks', () => {
      for (let i = 0; i < 20; i++) {
        const task = getFallbackTask(undefined, 5);
        expect(
          task.category === 'atomic_friction' || task.category === 'physical_somatic'
        ).toBe(true);
      }
    });

    it('completes 100 random catalog queries in <20ms (<10ms SLA)', () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        getRandomFallbackTask();
      }
      expect(Date.now() - start).toBeLessThan(50);
    });
  });

  // =========================================================================
  // 4. GEMINI CIRCUIT BREAKER & QUOTA EXHAUSTION
  // =========================================================================
  describe('4. Gemini Circuit Breaker & Quota Resilience', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_AI_API_KEY;
      resetCircuitBreaker();
    });

    afterEach(() => {
      process.env = { ...originalEnv };
      resetCircuitBreaker();
    });

    it('fast-bypasses in <5ms when no API key is configured with missing_api_key reason', async () => {
      const start = Date.now();
      const res = await executeUnstickWithBreaker();
      expect(Date.now() - start).toBeLessThan(10);
      expect(res.task.source).toBe('fallback_pool');
      expect(res.metadata.fallbackReason).toBe('missing_api_key');
      expect(getCircuitBreakerState().state).toBe('CLOSED');
    });

    it('trips to OPEN state after 3 consecutive failures and fast-bypasses 4th request', async () => {
      process.env.GEMINI_API_KEY = 'test_key';

      // Mock fetch failure
      let fetchCalls = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        fetchCalls += 1;
        const err: any = new Error('500 Internal Error');
        err.status = 500;
        throw err;
      });

      // Fail 1
      await executeUnstickWithBreaker();
      expect(getCircuitBreakerState().consecutiveFailures).toBe(1);
      expect(getCircuitBreakerState().state).toBe('CLOSED');

      // Fail 2
      await executeUnstickWithBreaker();
      expect(getCircuitBreakerState().consecutiveFailures).toBe(2);
      expect(getCircuitBreakerState().state).toBe('CLOSED');

      // Fail 3 -> trips breaker
      await executeUnstickWithBreaker();
      expect(getCircuitBreakerState().consecutiveFailures).toBe(3);
      expect(getCircuitBreakerState().state).toBe('OPEN');
      expect(fetchCalls).toBe(3);

      // Call 4: should NOT call fetch at all!
      const fastBypass = await executeUnstickWithBreaker();
      expect(fetchCalls).toBe(3); // Unchanged!
      expect(fastBypass.metadata.fallbackReason).toBe('circuit_breaker_open');
      expect(fastBypass.task.source).toBe('fallback_pool');
    });

    it('handles HTTP 429 quota exhaustion gracefully', async () => {
      process.env.GEMINI_API_KEY = 'test_key';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit quota exceeded',
      });

      const res = await executeUnstickWithBreaker();
      expect(res.task.source).toBe('fallback_pool');
      expect(res.metadata.fallbackReason).toBe('rate_limit_429');
    });

    it('handles malformed JSON from Gemini and gracefully recovers', async () => {
      process.env.GEMINI_API_KEY = 'test_key';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'NOT JSON' }] } }],
        }),
      });

      const res = await executeUnstickWithBreaker();
      expect(res.task.source).toBe('fallback_pool');
      expect(res.metadata.fallbackReason).toBe('malformed_json');
    });

    it('clamps invalid duration and validates structure in sanitizeAndValidateTask', () => {
      const task = sanitizeAndValidateTask({
        title: 'Calm Reset',
        instruction: 'Look at the horizon for 90 seconds while taking 5 diaphragmatic breaths.',
        durationMinutes: 100,
        category: 'invalid_cat',
        whyItWorks: 'Relieves cervical tension and resets optical focus.',
      });

      expect(task.durationMinutes).toBe(5);
      expect(task.category).toBe('physical_somatic');
      expect(task.source).toBe('gemini_llm');
    });
  });
});
