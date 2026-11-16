import type {
  CircuitBreakerResult,
  FallbackReason,
  MicroActivationTask,
  UnstickRequest,
} from './types';
import { getDeterministicFallback } from './catalog';
import { generateGeminiMicroActivation, getGeminiApiKey } from './gemini-client';

export const CIRCUIT_BREAKER_TIMEOUT_MS = 2500;
export const FAILURE_THRESHOLD = 3;
export const RESET_TIMEOUT_MS = 30000;

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface BreakerMetrics {
  state: BreakerState;
  consecutiveFailures: number;
  lastFailureTime: number;
}

// In-memory circuit breaker state
let breakerMetrics: BreakerMetrics = {
  state: 'CLOSED',
  consecutiveFailures: 0,
  lastFailureTime: 0,
};

/**
 * Resets the circuit breaker state to initial CLOSED state (for tests).
 */
export function resetCircuitBreaker(): void {
  breakerMetrics = {
    state: 'CLOSED',
    consecutiveFailures: 0,
    lastFailureTime: 0,
  };
}

/**
 * Gets the current internal breaker state for testing and inspection.
 */
export function getCircuitBreakerState(): BreakerMetrics {
  return { ...breakerMetrics };
}

/**
 * Records a successful invocation: resets failure counters and closes breaker.
 */
function recordSuccess(): void {
  breakerMetrics.consecutiveFailures = 0;
  breakerMetrics.state = 'CLOSED';
}

/**
 * Records a failure: increments failure counter and trips breaker if threshold exceeded.
 */
function recordFailure(): void {
  breakerMetrics.consecutiveFailures += 1;
  breakerMetrics.lastFailureTime = Date.now();
  if (breakerMetrics.consecutiveFailures >= FAILURE_THRESHOLD) {
    breakerMetrics.state = 'OPEN';
  }
}

/**
 * Determines whether the breaker should allow a probe call or reject immediately.
 */
function shouldAttemptExecution(): boolean {
  if (breakerMetrics.state === 'CLOSED') {
    return true;
  }

  const elapsed = Date.now() - breakerMetrics.lastFailureTime;
  if (elapsed > RESET_TIMEOUT_MS) {
    breakerMetrics.state = 'HALF_OPEN';
    return true;
  }

  return false;
}

/**
 * Executes unstick task generation with strict 2,500ms timeout and multi-layer fallback.
 * Authenticated and whitelisted clients are GUARANTEED to never encounter an unhandled exception or 500 error.
 */
export async function executeUnstickWithBreaker(
  req: UnstickRequest = {}
): Promise<CircuitBreakerResult> {
  const startTime = Date.now();

  // 1. Missing Key Check: Fast bypass (<2ms) if no API key is configured
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    const task = getDeterministicFallback(req);
    return {
      task,
      metadata: {
        source: 'fallback_pool',
        latencyMs: Date.now() - startTime,
        fallbackReason: 'missing_api_key',
      },
    };
  }

  // 2. Open Circuit Check: Fast bypass if breaker is currently tripped
  if (!shouldAttemptExecution()) {
    const task = getDeterministicFallback(req);
    return {
      task,
      metadata: {
        source: 'fallback_pool',
        latencyMs: Date.now() - startTime,
        fallbackReason: 'circuit_breaker_open',
      },
    };
  }

  // 3. Execution with 2,500ms AbortController timeout
  const abortController = new AbortController();
  let timerId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        abortController.abort();
        const error: any = new Error('Circuit breaker timeout: Gemini call exceeded 2,500ms');
        error.code = 'TIMEOUT';
        reject(error);
      }, CIRCUIT_BREAKER_TIMEOUT_MS);
    });

    const geminiPromise = generateGeminiMicroActivation(req, abortController.signal);

    const task = await Promise.race([geminiPromise, timeoutPromise]);
    if (timerId) clearTimeout(timerId);

    recordSuccess();

    return {
      task,
      metadata: {
        source: 'gemini_llm',
        latencyMs: Date.now() - startTime,
      },
    };
  } catch (error: any) {
    if (timerId) clearTimeout(timerId);
    recordFailure();

    // Map error to structured fallback reason
    let fallbackReason: FallbackReason = 'upstream_error';

    const isAbort =
      error?.name === 'AbortError' ||
      error?.code === 'TIMEOUT' ||
      abortController.signal.aborted;

    if (isAbort) {
      fallbackReason = 'circuit_breaker_timeout';
    } else if (error?.status === 429 || error?.code === 'RATE_LIMIT_429') {
      fallbackReason = 'rate_limit_429';
    } else if (error?.code === 'MISSING_API_KEY') {
      fallbackReason = 'missing_api_key';
    } else if (error?.code === 'MALFORMED_JSON') {
      fallbackReason = 'malformed_json';
    } else if (error instanceof TypeError) {
      fallbackReason = 'network_error';
    }

    const fallbackTask: MicroActivationTask = getDeterministicFallback(req);

    return {
      task: fallbackTask,
      metadata: {
        source: 'fallback_pool',
        latencyMs: Date.now() - startTime,
        fallbackReason,
      },
    };
  }
}
