/**
 * Tier 2: Boundary & Corner Cases E2E Tests (≥5 tests per feature)
 * Validates edge cases, boundary conditions, input validation, and failure limits.
 */

import { describe, it, expect, beforeEach } from './harness/test-runner.ts';
import { OpaqueBoxClient } from './harness/opaque-box-harness.ts';

describe('Tier 2: Boundary & Corner Cases Suite (35 Tests)', () => {
  let client: OpaqueBoxClient;

  beforeEach(() => {
    client = new OpaqueBoxClient({
      whitelistTable: ['allowed@buildnest.buzz'],
      whitelistEnv: ['admin@buildnest.buzz'],
    });
  });

  // =========================================================================
  // 1. Auth Boundaries & Token Lifecycles (5 Tests)
  // =========================================================================
  describe('1. Auth Boundaries & Token Lifecycles', () => {
    it('2.1: should treat expired session token as unauthenticated and redirect to /login', async () => {
      const auth = await client.signInWithPassword('allowed@buildnest.buzz', 'Password123!');
      // Force session expiration
      auth.session!.expiresAt = Date.now() - 1000;
      const nav = client.navigate('/dashboard', {
        cookies: { 'sb-access-token': auth.session!.accessToken },
      });
      expect(nav.status).toBe(307);
      expect(nav.location).toContain('/login');
    });

    it('2.2: should reject malformed or non-existent token without server crashes', () => {
      const nav = client.navigate('/dashboard', {
        cookies: { 'sb-access-token': 'corrupted-tampered-token-xyz' },
      });
      expect(nav.status).toBe(307);
      expect(nav.location).toContain('/login');
    });

    it('2.3: should reject empty or whitespace-only email and password during registration', async () => {
      const emptyEmail = await client.signUpWithPassword('   ', 'Password123!');
      expect(emptyEmail.success).toBe(false);
      expect(emptyEmail.error).toBe('Invalid email address');

      const emptyPass = await client.signUpWithPassword('user@buildnest.buzz', '   ');
      expect(emptyPass.success).toBe(false);
      expect(emptyPass.error).toBe('Password must be at least 8 characters');
    });

    it('2.4: should reject password with less than 8 characters', async () => {
      const res = await client.signUpWithPassword('user@buildnest.buzz', 'Short1!');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Password must be at least 8 characters');
    });

    it('2.5: should reject duplicate user registration with existing email', async () => {
      const first = await client.signUpWithPassword('unique@buildnest.buzz', 'Password123!');
      expect(first.success).toBe(true);
      const duplicate = await client.signUpWithPassword('unique@buildnest.buzz', 'Password123!');
      expect(duplicate.success).toBe(false);
      expect(duplicate.error).toBe('User already registered');
    });
  });

  // =========================================================================
  // 2. Whitelist Boundary Edge Cases (5 Tests)
  // =========================================================================
  describe('2. Whitelist Boundary Edge Cases', () => {
    it('2.6: should match email case-insensitively against whitelist', async () => {
      const checkUpper = await client.checkWhitelist('ALLOWED@BUILDNEST.BUZZ');
      expect(checkUpper.isWhitelisted).toBe(true);
      expect(checkUpper.email).toBe('allowed@buildnest.buzz');

      const checkMixed = await client.checkWhitelist('Admin@BuildNest.Buzz');
      expect(checkMixed.isWhitelisted).toBe(true);
      expect(checkMixed.email).toBe('admin@buildnest.buzz');
    });

    it('2.7: should trim leading and trailing whitespace from email in whitelist check', async () => {
      const check = await client.checkWhitelist('  allowed@buildnest.buzz  \t');
      expect(check.isWhitelisted).toBe(true);
      expect(check.email).toBe('allowed@buildnest.buzz');
    });

    it('2.8: should gracefully handle empty whitelist env variable without throwing', async () => {
      client.setEnvWhitelist([]);
      const check = await client.checkWhitelist('admin@buildnest.buzz');
      expect(check.isWhitelisted).toBe(false);
      expect(check.reason).toBe('not_whitelisted');
    });

    it('2.9: should return false and unauthenticated reason for null, undefined, or empty string', async () => {
      const checkNull = await client.checkWhitelist(null);
      expect(checkNull.isWhitelisted).toBe(false);
      expect(checkNull.reason).toBe('unauthenticated');

      const checkEmpty = await client.checkWhitelist('');
      expect(checkEmpty.isWhitelisted).toBe(false);
      expect(checkEmpty.reason).toBe('unauthenticated');
    });

    it('2.10: should reflect dynamic additions and removals from db whitelist immediately', async () => {
      expect(await client.isEmailWhitelisted('dynamic@buildnest.buzz')).toBe(false);
      client.addToDbWhitelist('dynamic@buildnest.buzz');
      expect(await client.isEmailWhitelisted('dynamic@buildnest.buzz')).toBe(true);
      client.removeFromDbWhitelist('dynamic@buildnest.buzz');
      expect(await client.isEmailWhitelisted('dynamic@buildnest.buzz')).toBe(false);
    });
  });

  // =========================================================================
  // 3. SSR Middleware Edge Interception Boundaries (5 Tests)
  // =========================================================================
  describe('3. SSR Middleware Edge Interception Boundaries', () => {
    it('2.11: should intercept deeply nested private subroutes and redirect to /login', () => {
      const nav = client.navigate('/routines/morning/tasks/subtask/item');
      expect(nav.status).toBe(307);
      expect(nav.location).toContain('/login?redirect=');
    });

    it('2.12: should allow public static assets to bypass auth middleware without 307 redirect', () => {
      expect(client.navigate('/_next/static/chunks/main.js').status).toBe(200);
      expect(client.navigate('/favicon.ico').status).toBe(200);
      expect(client.navigate('/logo.png').status).toBe(200);
    });

    it('2.13: should preserve target path in redirect URL query parameter for post-login return', () => {
      const nav = client.navigate('/routines/evening');
      expect(nav.location).toBe('/login?redirect=%2Froutines%2Fevening');
    });

    it('2.14: should return HTTP 401 JSON for unauthenticated direct API call to /api/unstick', () => {
      const nav = client.navigate('/api/unstick');
      expect(nav.status).toBe(401);
      expect(nav.headers['Content-Type']).toContain('application/json');
      expect(nav.body?.error).toBe('Unauthorized');
    });

    it('2.15: should return HTTP 403 JSON for non-whitelisted authenticated API call to /api/unstick', async () => {
      const auth = await client.signInWithPassword('uninvited@example.com', 'Password123!');
      const nav = client.navigate('/api/unstick', {
        cookies: { 'sb-access-token': auth.session!.accessToken },
      });
      expect(nav.status).toBe(403);
      expect(nav.body?.error).toBe('Forbidden: Whitelist Access Required');
    });
  });

  // =========================================================================
  // 4. Anchor Routines Boundary Conditions (5 Tests)
  // =========================================================================
  describe('4. Anchor Routines Boundary Conditions', () => {
    it('2.16: should accept minimum (1) and maximum (5) boundary values for energy level', () => {
      const minSession = client.startRoutineSession('morning_launchpad', '2026-11-15', 1);
      expect(minSession.energyLevel).toBe(1);

      const maxSession = client.startRoutineSession('morning_launchpad', '2026-11-16', 5);
      expect(maxSession.energyLevel).toBe(5);
    });

    it('2.17: should reject energy levels outside boundary (0, 6, -1)', () => {
      expect(() => client.startRoutineSession('morning_launchpad', '2026-11-15', 0)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
      expect(() => client.startRoutineSession('morning_launchpad', '2026-11-15', 6)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
      expect(() => client.startRoutineSession('morning_launchpad', '2026-11-15', -1)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
    });

    it('2.18: should reject non-integer energy levels (e.g. 3.5)', () => {
      expect(() => client.startRoutineSession('morning_launchpad', '2026-11-15', 3.5)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
    });

    it('2.19: should reject malformed date strings not strictly adhering to YYYY-MM-DD', () => {
      expect(() => client.startRoutineSession('morning_launchpad', '15-11-2026')).toThrow('Invalid date format');
      expect(() => client.startRoutineSession('morning_launchpad', '2026/11/15')).toThrow('Invalid date format');
      expect(() => client.startRoutineSession('morning_launchpad', 'today')).toThrow('Invalid date format');
    });

    it('2.20: should complete Evening Shutdown cleanly when 0 tasks were completed', () => {
      client.startRoutineSession('evening_shutdown', '2026-11-15');
      const session = client.completeRoutineSession('evening_shutdown', '2026-11-15', 'Quiet day with no task completions.');
      expect(session.status).toBe('completed');
      expect(session.reflectionNotes).toContain('Quiet day');
    });
  });

  // =========================================================================
  // 5. Keystone Focus & Rule of 3 Boundary Limits (5 Tests)
  // =========================================================================
  describe('5. Keystone Focus & Rule of 3 Boundary Limits', () => {
    it('2.21: should reject empty or whitespace-only task title', () => {
      expect(() => client.createTask('morning_launchpad', '   ', 'keystone', 30, '2026-11-15')).toThrow(
        'Task title cannot be empty'
      );
    });

    it('2.22: should reject task title exceeding 500 characters', () => {
      const longTitle = 'A'.repeat(501);
      expect(() => client.createTask('morning_launchpad', longTitle, 'secondary', 30, '2026-11-15')).toThrow(
        'Task title exceeds maximum length of 500 characters'
      );
    });

    it('2.23: should enforce estimated minutes boundaries (1 to 480 mins)', () => {
      expect(() => client.createTask('day_momentum', 'Valid Min', 'secondary', 1, '2026-11-15')).not.toThrow();
      expect(() => client.createTask('day_momentum', 'Valid Max', 'secondary', 480, '2026-11-15')).not.toThrow();
      expect(() => client.createTask('day_momentum', 'Zero Mins', 'secondary', 0, '2026-11-15')).toThrow(
        'Estimated minutes must be between 1 and 480'
      );
      expect(() => client.createTask('day_momentum', 'Excess Mins', 'secondary', 481, '2026-11-15')).toThrow(
        'Estimated minutes must be between 1 and 480'
      );
    });

    it('2.24: should throw error when attempting to update non-existent task ID', () => {
      expect(() => client.updateTaskStatus('non-existent-task-id', 'done')).toThrow('not found');
    });

    it('2.25: should automatically demote existing Keystone to secondary when a new Keystone is added', () => {
      const k1 = client.createTask('morning_launchpad', 'Initial Keystone Task', 'keystone', 60, '2026-11-15');
      const k2 = client.createTask('morning_launchpad', 'Urgent New Keystone Task', 'keystone', 45, '2026-11-15');
      expect(k2.priority).toBe('keystone');
      expect(k1.priority).toBe('secondary');
    });
  });

  // =========================================================================
  // 6. "Unstick Me" Timer & Modal Edge Cases (5 Tests)
  // =========================================================================
  describe('6. "Unstick Me" Timer & Modal Edge Cases', () => {
    it('2.26: should enforce minimum timer boundary of 2 minutes (120 seconds)', () => {
      const timer = client.createCountdownTimer(2);
      expect(timer.getRemainingSeconds()).toBe(120);
      expect(timer.formatDisplay()).toBe('02:00');
      expect(() => client.createCountdownTimer(1.9)).toThrow('between 2 and 5 minutes');
    });

    it('2.27: should enforce maximum timer boundary of 5 minutes (300 seconds)', () => {
      const timer = client.createCountdownTimer(5);
      expect(timer.getRemainingSeconds()).toBe(300);
      expect(timer.formatDisplay()).toBe('05:00');
      expect(() => client.createCountdownTimer(5.1)).toThrow('between 2 and 5 minutes');
    });

    it('2.28: should clamp countdown timer at 00:00 without producing negative values', () => {
      const timer = client.createCountdownTimer(2); // 120s
      timer.start();
      timer.tick(200); // Exceeds 120s
      expect(timer.getRemainingSeconds()).toBe(0);
      expect(timer.formatDisplay()).toBe('00:00');
      expect(timer.isCompleted()).toBe(true);
    });

    it('2.29: should not decrement timer when paused', () => {
      const timer = client.createCountdownTimer(3); // 180s
      timer.start();
      timer.tick(30);
      expect(timer.getRemainingSeconds()).toBe(150);
      timer.pause();
      timer.tick(30); // Ticking while paused
      expect(timer.getRemainingSeconds()).toBe(150);
      expect(timer.formatDisplay()).toBe('02:30');
    });

    it('2.30: should reset timer back to initial duration and reset completed state', () => {
      const timer = client.createCountdownTimer(2); // 120s
      timer.start();
      timer.tick(120);
      expect(timer.isCompleted()).toBe(true);
      timer.reset();
      expect(timer.isCompleted()).toBe(false);
      expect(timer.getRemainingSeconds()).toBe(120);
      expect(timer.formatDisplay()).toBe('02:00');
    });
  });

  // =========================================================================
  // 7. Circuit Breaker & Fallback Boundary Conditions (5 Tests)
  // =========================================================================
  describe('7. Circuit Breaker & Fallback Boundary Conditions', () => {
    it('2.31: should succeed normally when Gemini responds within 2,500ms threshold (e.g. 50ms)', async () => {
      const normalClient = new OpaqueBoxClient({ geminiMockLatencyMs: 50 });
      const task = await normalClient.requestUnstick();
      expect(task.source).toBe('gemini_llm');
    });

    it('2.32: should trigger circuit breaker when latency exceeds 2,500ms and return fallback pool task', async () => {
      const slowClient = new OpaqueBoxClient({ geminiMockFailure: 'timeout' });
      const task = await slowClient.requestUnstick();
      expect(task.source).toBe('fallback_pool');
      expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(task.durationMinutes).toBeLessThanOrEqual(5);
    });

    it('2.33: should handle corrupted non-JSON output and seamlessly fall back to catalog', async () => {
      const corruptClient = new OpaqueBoxClient({ geminiMockFailure: 'corrupted_json' });
      const task = await corruptClient.requestUnstick();
      expect(task.source).toBe('fallback_pool');
      expect(task.instruction).toBeDefined();
    });

    it('2.34: should catch missing required fields from LLM and gracefully degrade to fallback catalog', async () => {
      const missingFieldClient = new OpaqueBoxClient({ geminiMockFailure: 'missing_fields' });
      const task = await missingFieldClient.requestUnstick();
      expect(task.source).toBe('fallback_pool');
      expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
    });

    it('2.35: should clamp invalid duration from LLM to valid boundary [2, 5]', async () => {
      const invalidDurationClient = new OpaqueBoxClient({ geminiMockFailure: 'invalid_duration' });
      const task = await invalidDurationClient.requestUnstick();
      expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(task.durationMinutes).toBeLessThanOrEqual(5);
    });
  });
});
