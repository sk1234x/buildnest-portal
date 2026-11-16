import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeUnstickWithBreaker,
  resetCircuitBreaker,
  getCircuitBreakerState,
  CIRCUIT_BREAKER_TIMEOUT_MS,
} from '@/lib/unstick/circuit-breaker';

describe('Circuit Breaker Resilience Suite', () => {
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

  it('immediately returns deterministic fallback in <5ms when API key is missing', async () => {
    const start = performance.now();
    const result = await executeUnstickWithBreaker({ energyLevel: 2 });
    const elapsed = performance.now() - start;

    expect(result.task).toBeDefined();
    expect(result.task.source).toBe('fallback_pool');
    expect(result.metadata.source).toBe('fallback_pool');
    expect(result.metadata.fallbackReason).toBe('missing_api_key');
    expect(elapsed).toBeLessThan(15);
  });

  it('returns gemini_llm task on normal successful execution within timeout', async () => {
    process.env.GEMINI_API_KEY = 'mock_valid_key';

    const mockTask = {
      title: 'Physiological Sigh',
      instruction: 'Take two deep inhales and one long slow exhale 5 times.',
      durationMinutes: 2,
      category: 'sensory_grounding',
      whyItWorks: 'Activates parasympathetic tone via rapid alveoli reinflation.',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(mockTask) }] } }],
      }),
    } as any);

    const result = await executeUnstickWithBreaker({ currentRoutine: 'morning_launchpad' });

    expect(result.task.source).toBe('gemini_llm');
    expect(result.task.title).toBe(mockTask.title);
    expect(result.metadata.source).toBe('gemini_llm');
    expect(result.metadata.fallbackReason).toBeUndefined();
    expect(getCircuitBreakerState().consecutiveFailures).toBe(0);
  });

  it('triggers circuit breaker timeout and degrades to fallback_pool when call exceeds 2,500ms', async () => {
    process.env.GEMINI_API_KEY = 'mock_valid_key';

    // Mock fetch that hangs or takes 3000ms
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: async () => ({}),
          });
        }, 3000);

        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    vi.useFakeTimers();

    const breakerPromise = executeUnstickWithBreaker({});

    // Advance time past the 2,500ms circuit breaker threshold
    await vi.advanceTimersByTimeAsync(CIRCUIT_BREAKER_TIMEOUT_MS + 50);

    const result = await breakerPromise;
    vi.useRealTimers();

    expect(result.task).toBeDefined();
    expect(result.task.source).toBe('fallback_pool');
    expect(result.metadata.source).toBe('fallback_pool');
    expect(result.metadata.fallbackReason).toBe('circuit_breaker_timeout');
  });

  it('degrades to fallback_pool when HTTP 429 rate limit is encountered', async () => {
    process.env.GEMINI_API_KEY = 'mock_valid_key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Quota exceeded',
    } as any);

    const result = await executeUnstickWithBreaker({});

    expect(result.task.source).toBe('fallback_pool');
    expect(result.metadata.source).toBe('fallback_pool');
    expect(result.metadata.fallbackReason).toBe('rate_limit_429');
    expect(getCircuitBreakerState().consecutiveFailures).toBe(1);
  });

  it('degrades to fallback_pool when upstream HTTP 500 error occurs', async () => {
    process.env.GEMINI_API_KEY = 'mock_valid_key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Google API unavailable',
    } as any);

    const result = await executeUnstickWithBreaker({});

    expect(result.task.source).toBe('fallback_pool');
    expect(result.metadata.source).toBe('fallback_pool');
    expect(result.metadata.fallbackReason).toBe('upstream_error');
  });

  it('degrades to fallback_pool when Gemini returns malformed non-JSON', async () => {
    process.env.GEMINI_API_KEY = 'mock_valid_key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'non-json garbled text' }] } }],
      }),
    } as any);

    const result = await executeUnstickWithBreaker({});

    expect(result.task.source).toBe('fallback_pool');
    expect(result.metadata.fallbackReason).toBe('malformed_json');
  });

  it('transitions to OPEN state after 3 consecutive failures and bypasses fetch', async () => {
    process.env.GEMINI_API_KEY = 'mock_valid_key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Error',
    } as any);

    // 1st failure
    await executeUnstickWithBreaker({});
    expect(getCircuitBreakerState().consecutiveFailures).toBe(1);
    expect(getCircuitBreakerState().state).toBe('CLOSED');

    // 2nd failure
    await executeUnstickWithBreaker({});
    expect(getCircuitBreakerState().consecutiveFailures).toBe(2);
    expect(getCircuitBreakerState().state).toBe('CLOSED');

    // 3rd failure - trips breaker to OPEN
    await executeUnstickWithBreaker({});
    expect(getCircuitBreakerState().consecutiveFailures).toBe(3);
    expect(getCircuitBreakerState().state).toBe('OPEN');

    // 4th call: fetch should NOT be called; instant bypass with circuit_breaker_open
    const fetchCallCount = vi.mocked(global.fetch).mock.calls.length;
    const openResult = await executeUnstickWithBreaker({});

    expect(openResult.metadata.fallbackReason).toBe('circuit_breaker_open');
    expect(openResult.task.source).toBe('fallback_pool');
    expect(vi.mocked(global.fetch).mock.calls.length).toBe(fetchCallCount); // fetch not called!
  });

  it('guarantees zero unhandled exceptions: user NEVER receives 500 or crash', async () => {
    process.env.GEMINI_API_KEY = 'mock_valid_key';

    // Mock fetch throwing a catastrophic exception
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Catastrophic network partition'));

    const result = await executeUnstickWithBreaker({});

    expect(result.task).toBeDefined();
    expect(result.task.durationMinutes).toBeGreaterThanOrEqual(2);
    expect(result.task.durationMinutes).toBeLessThanOrEqual(5);
    expect(result.metadata.source).toBe('fallback_pool');
    expect(result.metadata.fallbackReason).toBe('network_error');
  });
});
