/**
 * Test Contracts matching PROJECT.md § Interface Contracts
 */

// --- 1. Auth & Whitelist Gatekeeper Contracts ---
export interface WhitelistCheckResult {
  isWhitelisted: boolean;
  email: string | null;
  reason?: 'whitelisted_db' | 'whitelisted_env' | 'not_whitelisted' | 'unauthenticated';
}

export interface UserSession {
  userId: string;
  email: string;
  accessToken: string;
  expiresAt: number; // Unix epoch ms
  isWhitelisted: boolean;
  provider?: 'email' | 'google';
}

// --- 2. Routine Planning Contracts ---
export type RoutineSlug = 'morning_launchpad' | 'day_momentum' | 'evening_shutdown';
export type RoutineStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface RoutineSession {
  id: string;
  userId: string;
  sessionDate: string; // YYYY-MM-DD
  routineSlug: RoutineSlug;
  status: RoutineStatus;
  startedAt?: string;
  completedAt?: string;
  energyLevel?: number; // 1 to 5
  keystoneFocus?: string;
  reflectionNotes?: string;
}

export type TaskPriority = 'keystone' | 'secondary' | 'backlog';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'deferred';

export interface TaskItem {
  id: string;
  userId: string;
  routineSlug: RoutineSlug;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes: number;
  actualMinutes?: number;
  sessionDate: string;
}

// --- 3. "Unstick Me" Panic Button Contracts ---
export type MicroActivationCategory =
  | 'physical_somatic'
  | 'environmental'
  | 'atomic_friction'
  | 'sensory_grounding';

export interface MicroActivationTask {
  id: string;
  title: string;
  instruction: string;
  durationMinutes: number; // strictly 2 to 5
  category: MicroActivationCategory;
  whyItWorks: string;
  source: 'gemini_llm' | 'fallback_pool';
}

export interface UnstickRequest {
  currentRoutine?: RoutineSlug;
  energyLevel?: number; // 1 to 5
  stuckContext?: string;
}

// --- 4. HTTP & SSR Edge Navigation Contracts ---
export interface NavigationResponse {
  status: number; // 200, 307, 401, 403, 404, 500
  location?: string; // Redirect target if status === 307
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body?: any;
  leakedProtectedChunk?: boolean;
}
