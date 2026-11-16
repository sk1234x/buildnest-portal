import { describe, it, expect } from 'vitest';
import {
  OFFLINE_FALLBACK_CATALOG,
  getFallbackTask,
  getDeterministicFallback,
  getRandomFallbackTask,
} from '@/lib/unstick/catalog';
import type { MicroActivationCategory } from '@/lib/unstick/types';

describe('Offline Fallback Catalog Unit Suite', () => {
  it('contains at least 30 items (exactly 32 items)', () => {
    expect(OFFLINE_FALLBACK_CATALOG.length).toBeGreaterThanOrEqual(30);
    expect(OFFLINE_FALLBACK_CATALOG.length).toBe(32);
  });

  it('contains exactly 8 items for each of the 4 required categories', () => {
    const categories: MicroActivationCategory[] = [
      'physical_somatic',
      'environmental',
      'atomic_friction',
      'sensory_grounding',
    ];

    for (const cat of categories) {
      const items = OFFLINE_FALLBACK_CATALOG.filter((i) => i.category === cat);
      expect(items.length).toBe(8);
    }
  });

  it('guarantees unique IDs across all 32 catalog items', () => {
    const ids = OFFLINE_FALLBACK_CATALOG.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(OFFLINE_FALLBACK_CATALOG.length);
  });

  it('verifies every item strictly complies with MicroActivationTask schema and boundaries', () => {
    for (const item of OFFLINE_FALLBACK_CATALOG) {
      expect(typeof item.id).toBe('string');
      expect(item.id.trim().length).toBeGreaterThan(0);

      expect(typeof item.title).toBe('string');
      expect(item.title.trim().length).toBeGreaterThan(3);

      expect(typeof item.instruction).toBe('string');
      expect(item.instruction.trim().length).toBeGreaterThan(15);

      expect(typeof item.whyItWorks).toBe('string');
      expect(item.whyItWorks.trim().length).toBeGreaterThan(15);

      expect(Number.isInteger(item.durationMinutes)).toBe(true);
      expect(item.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(item.durationMinutes).toBeLessThanOrEqual(5);

      expect(item.source).toBe('fallback_pool');
    }
  });

  it('filters by preferred category accurately', () => {
    const somatic = getFallbackTask('physical_somatic');
    expect(somatic.category).toBe('physical_somatic');
    expect(somatic.source).toBe('fallback_pool');

    const env = getFallbackTask('environmental');
    expect(env.category).toBe('environmental');

    const friction = getFallbackTask('atomic_friction');
    expect(friction.category).toBe('atomic_friction');

    const grounding = getFallbackTask('sensory_grounding');
    expect(grounding.category).toBe('sensory_grounding');
  });

  it('prioritizes restorative categories when energyLevel is low (<= 2)', () => {
    for (let i = 0; i < 20; i++) {
      const task = getFallbackTask(undefined, 1);
      expect(['sensory_grounding', 'physical_somatic']).toContain(task.category);
    }
  });

  it('supports excludeId to prevent immediate duplication', () => {
    const firstTask = getFallbackTask('physical_somatic');
    for (let i = 0; i < 10; i++) {
      const nextTask = getFallbackTask('physical_somatic', undefined, firstTask.id);
      expect(nextTask.id).not.toBe(firstTask.id);
      expect(nextTask.category).toBe('physical_somatic');
    }
  });

  it('determines fallback with routine context in getDeterministicFallback', () => {
    const momentumTask = getDeterministicFallback({
      currentRoutine: 'day_momentum',
      energyLevel: 4,
    });
    expect(momentumTask.category).toBe('atomic_friction');

    const eveningTask = getDeterministicFallback({
      currentRoutine: 'evening_shutdown',
    });
    expect(eveningTask.category).toBe('sensory_grounding');
  });

  it('getRandomFallbackTask returns valid items', () => {
    const randomTask = getRandomFallbackTask();
    expect(randomTask).toBeDefined();
    expect(randomTask.source).toBe('fallback_pool');
    expect(randomTask.durationMinutes).toBeGreaterThanOrEqual(2);
    expect(randomTask.durationMinutes).toBeLessThanOrEqual(5);
  });

  it('retrieves fallback task with sub-millisecond latency (<10ms threshold)', () => {
    const start = performance.now();
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      getDeterministicFallback({ energyLevel: (i % 5) + 1 });
    }
    const totalElapsed = performance.now() - start;
    const avgLatency = totalElapsed / iterations;

    expect(avgLatency).toBeLessThan(1); // Avg < 1ms
    expect(totalElapsed).toBeLessThan(50); // 1,000 lookups in under 50ms
  });
});
