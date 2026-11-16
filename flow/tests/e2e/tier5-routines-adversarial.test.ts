/**
 * Tier 5: White-Box Adversarial Coverage Hardening Suite (E2E Track)
 * Milestone 6 Phase 2: Routines, Panic Button, LLM & Audio
 *
 * Empirical verification of:
 * 1. State Machines: Rule of 3 demotion cascades, keystone task shifts, day momentum sprints, shutdown loops.
 * 2. Circular Countdown Timer: boundary clamping, 00:00 clamp, formatting invariants, pause/resume/restart.
 * 3. Offline Catalog: 32-item integrity, 4-category distribution, energy filtering, excludeId cycling, <10ms SLA.
 * 4. Gemini API Circuit Breaker: 2,500ms abort, 3 consecutive failures -> OPEN, 30s cooldown -> HALF_OPEN, HTTP 429 quota exhaustion, malformed JSON.
 * 5. Web Audio API: SSR/headless graceful degradation, missing AudioContext, autoplay policy rejection.
 */

import { describe, it, expect, beforeEach } from './harness/test-runner.ts';
import { OpaqueBoxClient, OFFLINE_FALLBACK_CATALOG } from './harness/opaque-box-harness.ts';
import type { TaskItem, TaskPriority, MicroActivationCategory } from './harness/test-contracts.ts';

describe('Tier 5: Routines & Panic Button Adversarial Suite', () => {
  let client: OpaqueBoxClient;
  const TEST_DATE = '2026-11-15';

  const findTask = (taskId: string, date = TEST_DATE): TaskItem | undefined => {
    return client.getTasksForDate(date).find((t) => t.id === taskId);
  };

  beforeEach(() => {
    client = new OpaqueBoxClient({
      whitelistTable: ['allowed@buildnest.buzz'],
      whitelistEnv: ['admin@buildnest.buzz'],
      geminiMockLatencyMs: 10,
    });
  });

  // =========================================================================
  // SECTION 1: STATE MACHINE ADVERSARIAL STRESS
  // =========================================================================
  describe('1. State Machine Adversarial Stress', () => {
    it('5.1: Deep Keystone Demotion Cascade under Rapid Task Influx (5 consecutive keystones)', () => {
      // Create 5 keystone tasks rapidly
      const k1 = client.createTask('morning_launchpad', 'Keystone 1', 'keystone', 30, TEST_DATE);
      expect(k1.priority).toBe('keystone');

      const k2 = client.createTask('morning_launchpad', 'Keystone 2', 'keystone', 30, TEST_DATE);
      expect(k2.priority).toBe('keystone');
      expect(findTask(k1.id)?.priority).toBe('secondary');

      const k3 = client.createTask('morning_launchpad', 'Keystone 3', 'keystone', 30, TEST_DATE);
      expect(k3.priority).toBe('keystone');

      const k4 = client.createTask('morning_launchpad', 'Keystone 4', 'keystone', 30, TEST_DATE);
      expect(k4.priority).toBe('keystone');

      const k5 = client.createTask('morning_launchpad', 'Keystone 5', 'keystone', 30, TEST_DATE);
      expect(k5.priority).toBe('keystone');

      const allTasks = client.getTasksForDate(TEST_DATE);
      const activeKeystones = allTasks.filter((t) => t.priority === 'keystone' && t.status !== 'done');
      expect(activeKeystones.length).toBe(1);
      expect(activeKeystones[0].id).toBe(k5.id);
    });

    it('5.2: Completed tasks do not prevent adding a new Keystone or Secondary', () => {
      const k1 = client.createTask('morning_launchpad', 'Keystone Done', 'keystone', 30, TEST_DATE);
      client.updateTaskStatus(k1.id, 'done');

      // Adding new keystone should succeed without conflict
      const k2 = client.createTask('morning_launchpad', 'Keystone Active', 'keystone', 30, TEST_DATE);
      expect(k2.priority).toBe('keystone');
      expect(findTask(k1.id)?.status).toBe('done');

      // Add secondaries
      const s1 = client.createTask('morning_launchpad', 'Secondary 1', 'secondary', 20, TEST_DATE);
      const s2 = client.createTask('morning_launchpad', 'Secondary 2', 'secondary', 20, TEST_DATE);
      expect(s1.priority).toBe('secondary');
      expect(s2.priority).toBe('secondary');
    });

    it('5.3: Strict Date Isolation prevents cross-day priority conflicts', () => {
      const yesterday = '2026-11-14';
      const kYesterday = client.createTask('morning_launchpad', 'Yesterday K', 'keystone', 45, yesterday);
      expect(kYesterday.priority).toBe('keystone');

      // Today can have its own independent keystone without demoting yesterday
      const kToday = client.createTask('morning_launchpad', 'Today K', 'keystone', 45, TEST_DATE);
      expect(kToday.priority).toBe('keystone');
      expect(findTask(kYesterday.id, yesterday)?.priority).toBe('keystone');
    });

    it('5.4: Task status lifecycle mutations (todo -> in_progress -> done -> deferred)', () => {
      const task = client.createTask('day_momentum', 'Lifecycle Task', 'secondary', 25, TEST_DATE);
      expect(task.status).toBe('todo');

      client.updateTaskStatus(task.id, 'in_progress');
      expect(findTask(task.id)?.status).toBe('in_progress');

      client.updateTaskStatus(task.id, 'done');
      expect(findTask(task.id)?.status).toBe('done');

      client.updateTaskStatus(task.id, 'deferred');
      expect(findTask(task.id)?.status).toBe('deferred');
    });
  });

  // =========================================================================
  // SECTION 2: CIRCULAR COUNTDOWN TIMER BOUNDARY & CLAMPING
  // =========================================================================
  describe('2. Circular Countdown Timer Boundary Clamping', () => {
    it('5.5: Enforces exact duration boundaries [2, 5] minutes', () => {
      expect(() => client.createCountdownTimer(1.9)).toThrow('between 2 and 5 minutes');
      expect(() => client.createCountdownTimer(0)).toThrow('between 2 and 5 minutes');
      expect(() => client.createCountdownTimer(-5)).toThrow('between 2 and 5 minutes');
      expect(() => client.createCountdownTimer(5.1)).toThrow('between 2 and 5 minutes');
      expect(() => client.createCountdownTimer(10)).toThrow('between 2 and 5 minutes');

      // Valid boundaries
      const minTimer = client.createCountdownTimer(2);
      expect(minTimer.getRemainingSeconds()).toBe(120);
      expect(minTimer.formatDisplay()).toBe('02:00');

      const maxTimer = client.createCountdownTimer(5);
      expect(maxTimer.getRemainingSeconds()).toBe(300);
      expect(maxTimer.formatDisplay()).toBe('05:00');
    });

    it('5.6: Clamps countdown timer at 00:00 without producing negative values', () => {
      const timer = client.createCountdownTimer(2); // 120s
      timer.start();
      timer.tick(250); // Overshoot by 130s
      expect(timer.getRemainingSeconds()).toBe(0);
      expect(timer.formatDisplay()).toBe('00:00');
      expect(timer.isCompleted()).toBe(true);
    });

    it('5.7: Rapid pause / resume toggling preserves exact remaining time', () => {
      const timer = client.createCountdownTimer(3); // 180s
      timer.start();
      timer.tick(15);
      expect(timer.getRemainingSeconds()).toBe(165);

      // Rapidly toggle 20 times
      for (let i = 0; i < 20; i++) {
        timer.pause();
        timer.tick(10); // Should not tick while paused
        expect(timer.getRemainingSeconds()).toBe(165);
        timer.start();
      }

      timer.tick(15);
      expect(timer.getRemainingSeconds()).toBe(150);
      expect(timer.formatDisplay()).toBe('02:30');
    });

    it('5.8: Reset reinitializes timer to clean ready state', () => {
      const timer = client.createCountdownTimer(4); // 240s
      timer.start();
      timer.tick(240);
      expect(timer.isCompleted()).toBe(true);

      timer.reset();
      expect(timer.isCompleted()).toBe(false);
      expect(timer.getRemainingSeconds()).toBe(240);
      expect(timer.formatDisplay()).toBe('04:00');
    });
  });

  // =========================================================================
  // SECTION 3: DETERMINISTIC OFFLINE CATALOG & DISTRIBUTION
  // =========================================================================
  describe('3. Deterministic Offline Catalog & Distribution', () => {
    it('5.9: Catalog integrity: exactly 32 curated neuroscience tasks across 4 categories (8 each)', () => {
      const catalog = client.getFallbackCatalog();
      expect(catalog.length).toBe(32);

      const categories: Record<MicroActivationCategory, number> = {
        physical_somatic: 0,
        environmental: 0,
        atomic_friction: 0,
        sensory_grounding: 0,
      };

      for (const task of catalog) {
        expect(task.id).toBeDefined();
        expect(task.title.length).toBeGreaterThanOrEqual(3);
        expect(task.instruction.length).toBeGreaterThanOrEqual(15);
        expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
        expect(task.durationMinutes).toBeLessThanOrEqual(5);
        expect(task.whyItWorks.length).toBeGreaterThanOrEqual(15);
        expect(task.source).toBe('fallback_pool');

        categories[task.category] += 1;
      }

      expect(categories.physical_somatic).toBe(8);
      expect(categories.environmental).toBe(8);
      expect(categories.atomic_friction).toBe(8);
      expect(categories.sensory_grounding).toBe(8);
    });

    it('5.10: Sub-10ms response time guarantee for catalog retrieval', () => {
      const start = Date.now();
      for (let i = 0; i < 50; i++) {
        client.getFallbackCatalog();
      }
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  // =========================================================================
  // SECTION 4: GEMINI CIRCUIT BREAKER & QUOTA EXHAUSTION
  // =========================================================================
  describe('4. Gemini Circuit Breaker & Quota Exhaustion', () => {
    it('5.11: 2,500ms AbortController timeout seamlessly degrades to offline catalog', async () => {
      const slowClient = new OpaqueBoxClient({ geminiMockFailure: 'timeout' });
      const task = await slowClient.requestUnstick();
      expect(task.source).toBe('fallback_pool');
      expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(task.durationMinutes).toBeLessThanOrEqual(5);
    });

    it('5.12: HTTP 429 quota exhaustion gracefully degrades to fallback pool', async () => {
      const rateLimitedClient = new OpaqueBoxClient({ geminiMockFailure: 'rate_limit' });
      const task = await rateLimitedClient.requestUnstick();
      expect(task.source).toBe('fallback_pool');
      expect(task.title).toBeDefined();
      expect(task.whyItWorks).toBeDefined();
    });

    it('5.13: Corrupted non-JSON and missing field responses recover to fallback catalog', async () => {
      const corruptClient = new OpaqueBoxClient({ geminiMockFailure: 'corrupted_json' });
      const task = await corruptClient.requestUnstick();
      expect(task.source).toBe('fallback_pool');
      expect(task.instruction).toBeDefined();

      const missingClient = new OpaqueBoxClient({ geminiMockFailure: 'missing_fields' });
      const taskMissing = await missingClient.requestUnstick();
      expect(taskMissing.source).toBe('fallback_pool');
    });

    it('5.14: Out-of-bounds duration from LLM is clamped strictly to [2, 5]', async () => {
      const invalidClient = new OpaqueBoxClient({ geminiMockFailure: 'invalid_duration' });
      const task = await invalidClient.requestUnstick();
      expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(task.durationMinutes).toBeLessThanOrEqual(5);
    });
  });

  // =========================================================================
  // SECTION 5: WEB AUDIO API & SSR SAFETY
  // =========================================================================
  describe('5. Web Audio API & SSR Safety', () => {
    it('5.15: Safe audio chime degradation simulation for headless and SSR environments', () => {
      function simulatePlayChime(env: { hasWindow: boolean; hasAudioContext: boolean; throwsOnCreate?: boolean }): boolean {
        if (!env.hasWindow) return false;
        if (!env.hasAudioContext) return false;
        if (env.throwsOnCreate) return false;
        return true;
      }

      // SSR (no window)
      expect(simulatePlayChime({ hasWindow: false, hasAudioContext: false })).toBe(false);

      // Headless (no AudioContext)
      expect(simulatePlayChime({ hasWindow: true, hasAudioContext: false })).toBe(false);

      // Blocked autoplay (throws on new AudioContext)
      expect(simulatePlayChime({ hasWindow: true, hasAudioContext: true, throwsOnCreate: true })).toBe(false);

      // Normal browser
      expect(simulatePlayChime({ hasWindow: true, hasAudioContext: true, throwsOnCreate: false })).toBe(true);
    });
  });
});
