import type { RoutineSlug } from '@/lib/routines/types';

/**
 * The 4 neuroscience-backed domains for micro-activation tasks.
 */
export type MicroActivationCategory =
  | 'physical_somatic'
  | 'environmental'
  | 'atomic_friction'
  | 'sensory_grounding';

/**
 * Provenance tag for task generation.
 */
export type MicroActivationSource = 'gemini_llm' | 'fallback_pool';

/**
 * Standardized micro-activation task surfaced by either Gemini LLM or the offline catalog.
 * Conforms to PROJECT.md § Interface Contract 3.
 */
export interface MicroActivationTask {
  id: string;
  title: string;
  instruction: string;
  durationMinutes: number; // Strictly between 2 and 5 minutes
  category: MicroActivationCategory;
  whyItWorks: string; // Neuroscience/psychological mechanism explanation
  source: MicroActivationSource;
}

/**
 * Client request payload sent to /api/unstick.
 */
export interface UnstickRequest {
  currentRoutine?: RoutineSlug;
  energyLevel?: number; // 1 to 5
  stuckContext?: string;
  preferredCategory?: MicroActivationCategory;
}

/**
 * Explicit reasons for falling back from Gemini to the deterministic catalog.
 */
export type FallbackReason =
  | 'missing_api_key'
  | 'circuit_breaker_timeout'
  | 'rate_limit_429'
  | 'upstream_error'
  | 'malformed_json'
  | 'schema_validation_error'
  | 'circuit_breaker_open'
  | 'network_error'
  | 'catastrophic_safety_catch';

/**
 * Enriched result from circuit breaker execution with observability telemetry.
 */
export interface CircuitBreakerResult {
  task: MicroActivationTask;
  metadata: {
    source: MicroActivationSource;
    latencyMs: number;
    fallbackReason?: FallbackReason;
  };
}
