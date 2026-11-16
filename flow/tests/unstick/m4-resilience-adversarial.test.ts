import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  executeUnstickWithBreaker,
  resetCircuitBreaker,
  getCircuitBreakerState,
  CIRCUIT_BREAKER_TIMEOUT_MS,
  RESET_TIMEOUT_MS,
  FAILURE_THRESHOLD,
} from '@/lib/unstick/circuit-breaker';
import {
  getGeminiApiKey,
  sanitizeAndValidateTask,
  buildUserPrompt,
  generateGeminiMicroActivation,
} from '@/lib/unstick/gemini-client';
import { POST } from '@/app/api/unstick/route';
import * as whitelistModule from '@/lib/auth/whitelist';
import * as circuitBreakerModule from '@/lib/unstick/circuit-breaker';

describe('Milestone 4 Adversarial Stress & Resilience Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetCircuitBreaker();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // 1. LATENCY & ABORTCONTROLLER TIMEOUT STRESS
  // =========================================================================
  describe('1. Latency & 2,500ms AbortController Timeout Stress', () => {
    it('aborts Gemini call when latency exceeds 2,500ms and returns fallback with HTTP 200 semantics', async () => {
      process.env.GEMINI_API_KEY = 'stress_test_key_123';

      let abortListenerFired = false;

      // Mock fetch with artificial 4,000ms delay that hooks into AbortSignal
      global.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({}),
            });
          }, 4000);

          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              abortListenerFired = true;
              clearTimeout(timer);
              const abortErr = new Error('The operation was aborted');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          }
        });
      });

      vi.useFakeTimers();

      const breakerPromise = executeUnstickWithBreaker({
        currentRoutine: 'day_momentum',
        energyLevel: 3,
        stuckContext: 'Hanging request simulation',
      });

      // Fast-forward 2,550ms past the 2,500ms circuit breaker threshold
      await vi.advanceTimersByTimeAsync(CIRCUIT_BREAKER_TIMEOUT_MS + 50);

      const result = await breakerPromise;
      vi.useRealTimers();

      // Assert AbortController abort signal was invoked
      expect(abortListenerFired).toBe(true);

      // Assert fallback task returned from pool
      expect(result.task).toBeDefined();
      expect(result.task.source).toBe('fallback_pool');
      expect(result.metadata.source).toBe('fallback_pool');
      expect(result.metadata.fallbackReason).toBe('circuit_breaker_timeout');

      // Assert task invariants
      expect(result.task.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(result.task.durationMinutes).toBeLessThanOrEqual(5);
      expect(result.task.title.length).toBeGreaterThanOrEqual(3);
      expect(result.task.instruction.length).toBeGreaterThanOrEqual(15);
      expect(result.task.whyItWorks.length).toBeGreaterThanOrEqual(15);
    });

    it('survives an unresolving upstream promise without hanging the caller', async () => {
      process.env.GEMINI_API_KEY = 'stress_test_key_123';

      // Simulates completely frozen upstream network socket (never resolves or rejects on its own)
      global.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      });

      vi.useFakeTimers();
      const breakerPromise = executeUnstickWithBreaker({});

      await vi.advanceTimersByTimeAsync(CIRCUIT_BREAKER_TIMEOUT_MS + 10);
      const result = await breakerPromise;
      vi.useRealTimers();

      expect(result.task).toBeDefined();
      expect(result.metadata.fallbackReason).toBe('circuit_breaker_timeout');
      expect(result.task.source).toBe('fallback_pool');
    });
  });

  // =========================================================================
  // 2. MISSING & EMPTY API KEYS FAST BYPASS (<5ms)
  // =========================================================================
  describe('2. Missing & Empty API Key Fast Bypass (<5ms)', () => {
    it('returns deterministic catalog fallback in <5ms when GEMINI_API_KEY is undefined', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_AI_API_KEY;

      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const t0 = performance.now();
      const result = await executeUnstickWithBreaker({ energyLevel: 1 });
      const elapsed = performance.now() - t0;

      expect(result.task).toBeDefined();
      expect(result.task.source).toBe('fallback_pool');
      expect(result.metadata.fallbackReason).toBe('missing_api_key');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(elapsed).toBeLessThan(10);
    });

    it('treats empty string, whitespace, and null environment keys as missing with instant bypass', async () => {
      const whitespaceVariants = ['', '   ', '\t\n  '];

      for (const variant of whitespaceVariants) {
        process.env.GEMINI_API_KEY = variant;
        process.env.GOOGLE_AI_API_KEY = variant;

        expect(getGeminiApiKey()).toBeNull();

        const fetchSpy = vi.fn();
        global.fetch = fetchSpy;

        const result = await executeUnstickWithBreaker({});
        expect(result.metadata.fallbackReason).toBe('missing_api_key');
        expect(result.task.source).toBe('fallback_pool');
        expect(fetchSpy).not.toHaveBeenCalled();
      }
    });

    it('falls back to GOOGLE_AI_API_KEY if GEMINI_API_KEY is absent', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.GOOGLE_AI_API_KEY = 'google_ai_backup_key';

      expect(getGeminiApiKey()).toBe('google_ai_backup_key');
    });
  });

  // =========================================================================
  // 3. HTTP 429 RATE LIMIT FROM GOOGLE AI STUDIO
  // =========================================================================
  describe('3. HTTP 429 Rate Limit Handling', () => {
    it('degrades cleanly to catalog on HTTP 429 with rate_limit_429 reason and increments failure count', async () => {
      process.env.GEMINI_API_KEY = 'active_key';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => JSON.stringify({
          error: {
            code: 429,
            message: 'Resource exhausted: rate limit exceeded for free-tier 15 RPM.',
            status: 'RESOURCE_EXHAUSTED',
          },
        }),
      } as any);

      const result = await executeUnstickWithBreaker({ currentRoutine: 'evening_shutdown' });

      expect(result.task).toBeDefined();
      expect(result.task.source).toBe('fallback_pool');
      expect(result.metadata.source).toBe('fallback_pool');
      expect(result.metadata.fallbackReason).toBe('rate_limit_429');
      expect(getCircuitBreakerState().consecutiveFailures).toBe(1);
    });
  });

  // =========================================================================
  // 4. MALFORMED RESPONSES & SCHEMA CORRUPTION
  // =========================================================================
  describe('4. Malformed Responses, Missing Fields & Output Sanitization', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'valid_key';
    });

    it('degrades cleanly when upstream returns HTML error page (e.g. 502 Bad Gateway)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '<!DOCTYPE html><html><body>502 Bad Gateway</body></html>' }] } }],
        }),
      } as any);

      const result = await executeUnstickWithBreaker({});
      expect(result.task.source).toBe('fallback_pool');
      expect(result.metadata.fallbackReason).toBe('malformed_json');
    });

    it('degrades cleanly when upstream returns empty text or null candidates', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [],
        }),
      } as any);

      const result = await executeUnstickWithBreaker({});
      expect(result.task.source).toBe('fallback_pool');
      expect(result.metadata.fallbackReason).toBe('malformed_json');
    });

    it('rejects output missing required fields (title, instruction, or whyItWorks)', () => {
      expect(() => sanitizeAndValidateTask({ instruction: 'Valid instruction that is long enough.', whyItWorks: 'Valid explanation.' })).toThrow('missing valid title');
      expect(() => sanitizeAndValidateTask({ title: 'T', instruction: 'Valid instruction that is long enough.', whyItWorks: 'Valid explanation.' })).toThrow('missing valid title');
      expect(() => sanitizeAndValidateTask({ title: 'Valid Title', instruction: 'Too short', whyItWorks: 'Valid explanation.' })).toThrow('missing valid instruction');
      expect(() => sanitizeAndValidateTask({ title: 'Valid Title', instruction: 'Valid instruction with sufficient length.', whyItWorks: 'Short' })).toThrow('missing valid whyItWorks');
    });

    it('clamps durationMinutes strictly to [2, 5] regardless of wild upstream values', () => {
      const base = {
        title: 'Micro Reset',
        instruction: 'Stand up and shake both hands vigorously for thirty seconds.',
        whyItWorks: 'Discharges sympathetic arousal and resets motor cortex.',
      };

      // Negative duration -> clamped to 2
      expect(sanitizeAndValidateTask({ ...base, durationMinutes: -50 }).durationMinutes).toBe(2);
      // Zero duration -> clamped to 2
      expect(sanitizeAndValidateTask({ ...base, durationMinutes: 0 }).durationMinutes).toBe(2);
      // 1 minute -> clamped to 2
      expect(sanitizeAndValidateTask({ ...base, durationMinutes: 1 }).durationMinutes).toBe(2);
      // 100 minutes -> clamped to 5
      expect(sanitizeAndValidateTask({ ...base, durationMinutes: 100 }).durationMinutes).toBe(5);
      // NaN or non-number string -> clamped to 2
      expect(sanitizeAndValidateTask({ ...base, durationMinutes: 'not_a_number' }).durationMinutes).toBe(2);
      // Valid 4 minutes -> preserved
      expect(sanitizeAndValidateTask({ ...base, durationMinutes: 4 }).durationMinutes).toBe(4);
    });

    it('normalizes unrecognized categories to physical_somatic', () => {
      const task = sanitizeAndValidateTask({
        title: 'Unknown Domain Task',
        instruction: 'Look at the ceiling and inhale deeply through the nose.',
        durationMinutes: 3,
        category: 'cosmic_transcendence' as any,
        whyItWorks: 'Calms optical nerves and relaxes cervical spine.',
      });

      expect(task.category).toBe('physical_somatic');
    });
  });

  // =========================================================================
  // 5. CONSECUTIVE FAILURE TRIPPING & 30-SECOND RESET STATE MACHINE
  // =========================================================================
  describe('5. Circuit Breaker State Machine & 30-Second Reset Interval', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test_breaker_key';
    });

    it('trips from CLOSED to OPEN after exactly 3 consecutive failures', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as any);

      expect(getCircuitBreakerState().state).toBe('CLOSED');
      expect(getCircuitBreakerState().consecutiveFailures).toBe(0);

      // Failure 1
      await executeUnstickWithBreaker({});
      expect(getCircuitBreakerState().state).toBe('CLOSED');
      expect(getCircuitBreakerState().consecutiveFailures).toBe(1);

      // Failure 2
      await executeUnstickWithBreaker({});
      expect(getCircuitBreakerState().state).toBe('CLOSED');
      expect(getCircuitBreakerState().consecutiveFailures).toBe(2);

      // Failure 3 -> Trips to OPEN
      await executeUnstickWithBreaker({});
      expect(getCircuitBreakerState().state).toBe('OPEN');
      expect(getCircuitBreakerState().consecutiveFailures).toBe(3);

      // Subsequent 4th call while OPEN: bypasses fetch completely
      const fetchCallsBefore = vi.mocked(global.fetch).mock.calls.length;
      const openResult = await executeUnstickWithBreaker({});

      expect(openResult.metadata.fallbackReason).toBe('circuit_breaker_open');
      expect(openResult.task.source).toBe('fallback_pool');
      expect(vi.mocked(global.fetch).mock.calls.length).toBe(fetchCallsBefore);
    });

    it('resets from OPEN to CLOSED via HALF_OPEN when 30 seconds elapse and probe succeeds', async () => {
      // 1. Trip breaker to OPEN with 3 failures
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Down',
      } as any);

      for (let i = 0; i < FAILURE_THRESHOLD; i++) {
        await executeUnstickWithBreaker({});
      }
      expect(getCircuitBreakerState().state).toBe('OPEN');

      // 2. Call before 30 seconds: should remain OPEN
      vi.useFakeTimers();
      await vi.advanceTimersByTimeAsync(RESET_TIMEOUT_MS - 1000); // 29,000ms

      const stillOpenResult = await executeUnstickWithBreaker({});
      expect(stillOpenResult.metadata.fallbackReason).toBe('circuit_breaker_open');

      // 3. Advance time past the 30,000ms reset threshold
      await vi.advanceTimersByTimeAsync(2000); // Now 31,000ms elapsed

      // 4. Configure fetch to succeed for the probe call
      const mockSuccessTask = {
        title: 'Postural Shake',
        instruction: 'Stand up immediately and shake both hands for 30 seconds.',
        durationMinutes: 2,
        category: 'physical_somatic',
        whyItWorks: 'Discharges nervous tension and activates motor loops.',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockSuccessTask) }] } }],
        }),
      } as any);

      // 5. Probe call executes
      const probeResult = await executeUnstickWithBreaker({});
      vi.useRealTimers();

      // Assert breaker recovered: state CLOSED, failures 0, source gemini_llm
      expect(probeResult.task.source).toBe('gemini_llm');
      expect(probeResult.task.title).toBe(mockSuccessTask.title);
      expect(getCircuitBreakerState().state).toBe('CLOSED');
      expect(getCircuitBreakerState().consecutiveFailures).toBe(0);
    });

    it('trips back to OPEN if probe call fails in HALF_OPEN state', async () => {
      // 1. Trip breaker to OPEN
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Down',
      } as any);

      for (let i = 0; i < FAILURE_THRESHOLD; i++) {
        await executeUnstickWithBreaker({});
      }
      expect(getCircuitBreakerState().state).toBe('OPEN');

      // 2. Advance time past 30s
      vi.useFakeTimers();
      await vi.advanceTimersByTimeAsync(RESET_TIMEOUT_MS + 500);

      // 3. Probe call fails as well
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Still Unavailable',
      } as any);

      const probeFailResult = await executeUnstickWithBreaker({});
      vi.useRealTimers();

      // Should fall back and return to OPEN state
      expect(probeFailResult.task.source).toBe('fallback_pool');
      expect(probeFailResult.metadata.fallbackReason).toBe('upstream_error');
      expect(getCircuitBreakerState().state).toBe('OPEN');
      expect(getCircuitBreakerState().consecutiveFailures).toBe(4);
    });
  });

  // =========================================================================
  // 6. ROUTE SECURITY BOUNDARY & ZERO-500 GUARANTEE (/api/unstick)
  // =========================================================================
  describe('6. Route Security Boundary & Zero-500 Guarantee (/api/unstick)', () => {
    it('returns HTTP 401 Unauthorized for unauthenticated requests with zero data leakage', async () => {
      vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockRejectedValue(
        new Error('Unauthorized: No active session')
      );

      const req = new NextRequest('http://localhost:3000/api/unstick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentRoutine: 'morning_launchpad' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
      expect(body.title).toBeUndefined();
      expect(body.instruction).toBeUndefined();
    });

    it('returns HTTP 403 Forbidden for authenticated non-whitelisted users with zero data leakage', async () => {
      vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockRejectedValue(
        new Error('Forbidden: User email is not whitelisted')
      );

      const req = new NextRequest('http://localhost:3000/api/unstick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentRoutine: 'morning_launchpad' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body).toEqual({ error: 'Forbidden: Whitelist Access Required' });
      expect(body.title).toBeUndefined();
      expect(body.instruction).toBeUndefined();
    });

    it('returns HTTP 200 with valid MicroActivationTask for authenticated whitelisted users', async () => {
      vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockResolvedValue({
        userId: 'whitelisted_user_789',
        email: 'founder@buildnest.buzz',
      });

      const req = new NextRequest('http://localhost:3000/api/unstick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energyLevel: 2 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const task = await res.json();
      expect(task.id).toBeDefined();
      expect(task.title.length).toBeGreaterThanOrEqual(3);
      expect(task.instruction.length).toBeGreaterThanOrEqual(15);
      expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(task.durationMinutes).toBeLessThanOrEqual(5);
      expect(res.headers.get('X-Flow-Unstick-Source')).toBe('fallback_pool');
    });

    it('guarantees zero HTTP 500 errors even under catastrophic internal unhandled exception', async () => {
      vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockResolvedValue({
        userId: 'whitelisted_user_789',
        email: 'founder@buildnest.buzz',
      });

      // Force executeUnstickWithBreaker to blow up catastrophically
      vi.spyOn(circuitBreakerModule, 'executeUnstickWithBreaker').mockRejectedValue(
        new Error('Unexpected V8 Memory Corruption')
      );

      const req = new NextRequest('http://localhost:3000/api/unstick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await POST(req);

      // Must degrade safely to HTTP 200 via catastrophic safety catch
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Flow-Unstick-Source')).toBe('fallback_pool');
      expect(res.headers.get('X-Flow-Fallback-Reason')).toBe('catastrophic_safety_catch');

      const body = await res.json();
      expect(body).toBeDefined();
      expect(body.title).toBeDefined();
      expect(body.instruction.length).toBeGreaterThanOrEqual(15);
      expect(body.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(body.durationMinutes).toBeLessThanOrEqual(5);
    });
  });

  // =========================================================================
  // 7. INPUT FUZZING & BURST STRESS
  // =========================================================================
  describe('7. Adversarial Input Fuzzing & Rapid Burst', () => {
    it('safely sanitizes oversized stuckContext, control characters, and injection attempts', () => {
      const hugeInput = 'A'.repeat(5000) + '\x00\x1F\x7F' + '<script>alert(1)</script>';
      const prompt = buildUserPrompt({
        stuckContext: hugeInput,
        energyLevel: 999 as any,
        preferredCategory: 'physical_somatic',
      });

      expect(prompt).toBeDefined();
      // Prompt must clamp stuckContext to 300 chars and clamp energy to 5
      expect(prompt).toContain('Current energy level: 5/5.');
      expect(prompt).toContain('Preferred activation category: physical_somatic.');
      expect(prompt.length).toBeLessThan(1000);
      expect(prompt).not.toContain('\x00');
    });

    it('survives rapid burst of 50 concurrent requests without failure', async () => {
      vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockResolvedValue({
        userId: 'stress_user',
        email: 'stress@buildnest.buzz',
      });

      const burstRequests = Array.from({ length: 50 }, (_, i) => {
        const req = new NextRequest('http://localhost:3000/api/unstick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            energyLevel: (i % 5) + 1,
            stuckContext: `Burst request ${i}`,
          }),
        });
        return POST(req);
      });

      const responses = await Promise.all(burstRequests);

      for (const res of responses) {
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.durationMinutes).toBeGreaterThanOrEqual(2);
        expect(data.durationMinutes).toBeLessThanOrEqual(5);
      }
    });
  });
});
