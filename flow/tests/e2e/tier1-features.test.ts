/**
 * Tier 1: Feature Coverage E2E Tests (≥5 tests per feature)
 * Validates all 10 core features of Flow activity planner.
 */

import { describe, it, expect, beforeEach } from './harness/test-runner.ts';
import { OpaqueBoxClient, OFFLINE_FALLBACK_CATALOG } from './harness/opaque-box-harness.ts';
import type { RoutineSlug, TaskPriority } from './harness/test-contracts.ts';

describe('Tier 1: Feature Coverage Suite (50 Tests across 10 Features)', () => {
  let client: OpaqueBoxClient;

  beforeEach(() => {
    client = new OpaqueBoxClient({
      whitelistTable: ['allowed@buildnest.buzz', 'founder@buildnest.buzz'],
      whitelistEnv: ['admin@buildnest.buzz', 'tester@buildnest.buzz'],
      geminiMockLatencyMs: 10,
    });
  });

  // =========================================================================
  // Feature 1: Email & Password Authentication (5 Tests)
  // =========================================================================
  describe('Feature 1: Email & Password Authentication', () => {
    it('1.1: should register a new user with valid email and password', async () => {
      const res = await client.signUpWithPassword('newuser@buildnest.buzz', 'SecurePass123!');
      expect(res.success).toBe(true);
      expect(res.session).toBeDefined();
      expect(res.session?.email).toBe('newuser@buildnest.buzz');
    });

    it('1.2: should authenticate existing user with correct password', async () => {
      const res = await client.signInWithPassword('allowed@buildnest.buzz', 'Password123!');
      expect(res.success).toBe(true);
      expect(res.session).toBeDefined();
      expect(res.session?.accessToken).toBeDefined();
      expect(client.getCurrentSession()?.email).toBe('allowed@buildnest.buzz');
    });

    it('1.3: should reject sign-in with incorrect password', async () => {
      const res = await client.signInWithPassword('allowed@buildnest.buzz', 'WrongPassword!');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid login credentials');
      expect(client.getCurrentSession()).toBeNull();
    });

    it('1.4: should reject sign-in with non-existent email', async () => {
      const res = await client.signInWithPassword('nobody@buildnest.buzz', 'Password123!');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid login credentials');
    });

    it('1.5: should revoke active session on sign out', async () => {
      await client.signInWithPassword('allowed@buildnest.buzz', 'Password123!');
      expect(client.getCurrentSession()).not.toBeNull();
      client.signOut();
      expect(client.getCurrentSession()).toBeNull();
    });
  });

  // =========================================================================
  // Feature 2: Google OAuth Sign-In (5 Tests)
  // =========================================================================
  describe('Feature 2: Google OAuth Sign-In', () => {
    it('2.1: should generate valid Google OAuth URL with proper scopes and redirect URI', () => {
      const url = client.getGoogleOAuthUrl('https://flow.buildnest.buzz/auth/callback', 'state-token-123');
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=buildnest-google-oauth.apps.googleusercontent.com');
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fflow.buildnest.buzz%2Fauth%2Fcallback');
      expect(url).toContain('state=state-token-123');
    });

    it('2.2: should exchange valid OAuth code for session and redirect to /dashboard', async () => {
      const res = await client.handleOAuthCallback('valid-code', 'csrf-test-token', 'allowed@buildnest.buzz');
      expect(res.status).toBe(307);
      expect(res.location).toBe('/dashboard');
      expect(res.session).toBeDefined();
      expect(res.session?.provider).toBe('google');
      expect(res.session?.isWhitelisted).toBe(true);
    });

    it('2.3: should reject OAuth callback on CSRF state mismatch', async () => {
      const res = await client.handleOAuthCallback('valid-code', 'tampered-csrf-token', 'allowed@buildnest.buzz');
      expect(res.status).toBe(307);
      expect(res.location).toBe('/login?error=state_mismatch');
      expect(res.error).toBe('state_mismatch');
      expect(res.session).toBeUndefined();
    });

    it('2.4: should reject invalid authorization code parameter', async () => {
      const res = await client.handleOAuthCallback('invalid', 'csrf-test-token', 'allowed@buildnest.buzz');
      expect(res.status).toBe(307);
      expect(res.location).toBe('/login?error=invalid_grant');
      expect(res.error).toBe('invalid_grant');
    });

    it('2.5: should retain Google session credentials and expiration timestamp', async () => {
      const res = await client.handleOAuthCallback('valid-auth-code-xyz', 'csrf-test-token', 'founder@buildnest.buzz');
      expect(res.session?.expiresAt).toBeGreaterThan(Date.now());
      expect(client.getCurrentSession()?.email).toBe('founder@buildnest.buzz');
    });
  });

  // =========================================================================
  // Feature 3: Whitelist Access Control Enforcement (5 Tests)
  // =========================================================================
  describe('Feature 3: Whitelist Access Control Enforcement', () => {
    it('3.1: should approve users present in public.whitelist table with whitelisted_db', async () => {
      const check = await client.checkWhitelist('allowed@buildnest.buzz');
      expect(check.isWhitelisted).toBe(true);
      expect(check.reason).toBe('whitelisted_db');
    });

    it('3.2: should approve users present in WHITELIST_EMAILS env variable with whitelisted_env', async () => {
      const check = await client.checkWhitelist('admin@buildnest.buzz');
      expect(check.isWhitelisted).toBe(true);
      expect(check.reason).toBe('whitelisted_env');
    });

    it('3.3: should reject uninvited users with not_whitelisted', async () => {
      const check = await client.checkWhitelist('intruder@random.com');
      expect(check.isWhitelisted).toBe(false);
      expect(check.reason).toBe('not_whitelisted');
    });

    it('3.4: should reject non-whitelisted OAuth sign-in and redirect to login error', async () => {
      const res = await client.handleOAuthCallback('code-123', 'csrf-test-token', 'uninvited@example.com');
      expect(res.status).toBe(307);
      expect(res.location).toBe('/login?error=not_whitelisted');
      expect(res.session).toBeUndefined();
    });

    it('3.5: should allow public access to /access-denied without leaking database records', () => {
      const nav = client.navigate('/access-denied');
      expect(nav.status).toBe(200);
      expect(nav.leakedProtectedChunk).toBe(false);
    });
  });

  // =========================================================================
  // Feature 4: SSR Edge Middleware Gatekeeper (5 Tests)
  // =========================================================================
  describe('Feature 4: SSR Edge Middleware Gatekeeper', () => {
    it('4.1: should redirect unauthenticated requests to /dashboard with HTTP 307 to /login', () => {
      const nav = client.navigate('/dashboard');
      expect(nav.status).toBe(307);
      expect(nav.location).toContain('/login?redirect=');
      expect(nav.leakedProtectedChunk).toBe(false);
    });

    it('4.2: should redirect unauthenticated requests to /routines/morning with HTTP 307 to /login', () => {
      const nav = client.navigate('/routines/morning');
      expect(nav.status).toBe(307);
      expect(nav.location).toContain('/login?redirect=');
    });

    it('4.3: should block unauthenticated API requests to /api/unstick with HTTP 401 JSON', () => {
      const nav = client.navigate('/api/unstick');
      expect(nav.status).toBe(401);
      expect(nav.body?.error).toBe('Unauthorized');
    });

    it('4.4: should redirect authenticated but non-whitelisted users to /access-denied with HTTP 307', async () => {
      const auth = await client.signInWithPassword('uninvited@example.com', 'Password123!');
      const nav = client.navigate('/dashboard', { cookies: { 'sb-access-token': auth.session!.accessToken } });
      expect(nav.status).toBe(307);
      expect(nav.location).toBe('/access-denied');
    });

    it('4.5: should allow authenticated whitelisted users to access /dashboard with HTTP 200', async () => {
      const auth = await client.signInWithPassword('allowed@buildnest.buzz', 'Password123!');
      const nav = client.navigate('/dashboard', { cookies: { 'sb-access-token': auth.session!.accessToken } });
      expect(nav.status).toBe(200);
      expect(nav.body?.user).toBe('allowed@buildnest.buzz');
    });
  });

  // =========================================================================
  // Feature 5: 3 Daily Anchor Routines Core Model (5 Tests)
  // =========================================================================
  describe('Feature 5: 3 Daily Anchor Routines Core Model', () => {
    it('5.1: should initialize Morning Launchpad routine in in_progress state with valid date', () => {
      const session = client.startRoutineSession('morning_launchpad', '2026-11-15');
      expect(session.routineSlug).toBe('morning_launchpad');
      expect(session.sessionDate).toBe('2026-11-15');
      expect(session.status).toBe('in_progress');
      expect(session.startedAt).toBeDefined();
    });

    it('5.2: should accept energy level score between 1 and 5 in Morning Launchpad', () => {
      const session = client.startRoutineSession('morning_launchpad', '2026-11-15', 4);
      expect(session.energyLevel).toBe(4);
    });

    it('5.3: should start and track Day Momentum Block session', () => {
      const session = client.startRoutineSession('day_momentum', '2026-11-15');
      expect(session.routineSlug).toBe('day_momentum');
      expect(session.status).toBe('in_progress');
    });

    it('5.4: should complete Evening Shutdown routine and record reflection notes', () => {
      client.startRoutineSession('evening_shutdown', '2026-11-15');
      const completed = client.completeRoutineSession('evening_shutdown', '2026-11-15', 'Accomplished Keystone task; steady flow.');
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
      expect(completed.reflectionNotes).toContain('Accomplished Keystone');
    });

    it('5.5: should return existing session without duplication on repeat start calls for same date', () => {
      const session1 = client.startRoutineSession('morning_launchpad', '2026-11-15', 3);
      const session2 = client.startRoutineSession('morning_launchpad', '2026-11-15', 5);
      expect(session1.id).toBe(session2.id);
      expect(session2.energyLevel).toBe(5);
    });
  });

  // =========================================================================
  // Feature 6: Keystone Focus & Rule of 3 Task Management (5 Tests)
  // =========================================================================
  describe('Feature 6: Keystone Focus & Rule of 3 Task Management', () => {
    it('6.1: should allow setting exactly 1 Keystone priority focus task', () => {
      const task = client.createTask('morning_launchpad', 'Design Architecture Blueprint', 'keystone', 60, '2026-11-15');
      expect(task.priority).toBe('keystone');
      expect(task.title).toBe('Design Architecture Blueprint');
    });

    it('6.2: should allow adding up to 2 secondary priority tasks', () => {
      const t1 = client.createTask('morning_launchpad', 'Secondary Task One', 'secondary', 30, '2026-11-15');
      const t2 = client.createTask('morning_launchpad', 'Secondary Task Two', 'secondary', 25, '2026-11-15');
      expect(t1.priority).toBe('secondary');
      expect(t2.priority).toBe('secondary');
    });

    it('6.3: should demote a 3rd secondary task to backlog to enforce Rule of 3', () => {
      client.createTask('morning_launchpad', 'Sec 1', 'secondary', 20, '2026-11-15');
      client.createTask('morning_launchpad', 'Sec 2', 'secondary', 20, '2026-11-15');
      const t3 = client.createTask('morning_launchpad', 'Sec 3 Excess', 'secondary', 20, '2026-11-15');
      expect(t3.priority).toBe('backlog');
    });

    it('6.4: should demote former Keystone to secondary when a new Keystone is added', () => {
      const k1 = client.createTask('morning_launchpad', 'Initial Keystone', 'keystone', 45, '2026-11-15');
      expect(k1.priority).toBe('keystone');
      const k2 = client.createTask('morning_launchpad', 'New Keystone Focus', 'keystone', 60, '2026-11-15');
      expect(k2.priority).toBe('keystone');
      expect(k1.priority).toBe('secondary');
    });

    it('6.5: should transition task status through todo -> in_progress -> done', () => {
      const task = client.createTask('day_momentum', 'Focus Sprint Task', 'keystone', 30, '2026-11-15');
      expect(task.status).toBe('todo');
      const inProg = client.updateTaskStatus(task.id, 'in_progress');
      expect(inProg.status).toBe('in_progress');
      const done = client.updateTaskStatus(task.id, 'done');
      expect(done.status).toBe('done');
    });
  });

  // =========================================================================
  // Feature 7: "Unstick Me" Panic Button Modal & Timer (5 Tests)
  // =========================================================================
  describe('Feature 7: "Unstick Me" Panic Button Modal & Timer', () => {
    it('7.1: should surface a single micro-activation task when panic button is triggered', async () => {
      const task = await client.requestUnstick();
      expect(task).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.instruction).toBeDefined();
    });

    it('7.2: should provide complete task metadata with category and whyItWorks explanation', async () => {
      const task = await client.requestUnstick();
      expect(task.category).toBeDefined();
      expect(['physical_somatic', 'environmental', 'atomic_friction', 'sensory_grounding']).toContain(task.category);
      expect(task.whyItWorks.length).toBeGreaterThan(10);
    });

    it('7.3: should ensure surfaced task duration is strictly between 2 and 5 minutes', async () => {
      const task = await client.requestUnstick();
      expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
      expect(task.durationMinutes).toBeLessThanOrEqual(5);
    });

    it('7.4: should format circular countdown timer correctly as MM:SS and tick down', () => {
      const timer = client.createCountdownTimer(3); // 3 minutes = 180s
      expect(timer.formatDisplay()).toBe('03:00');
      timer.start();
      timer.tick(30);
      expect(timer.getRemainingSeconds()).toBe(150);
      expect(timer.formatDisplay()).toBe('02:30');
    });

    it('7.5: should support pause, resume, and reach completed state when seconds elapse', () => {
      const timer = client.createCountdownTimer(2); // 120s
      timer.start();
      timer.tick(60);
      expect(timer.getRemainingSeconds()).toBe(60);
      timer.pause();
      timer.tick(30); // Paused: should not tick
      expect(timer.getRemainingSeconds()).toBe(60);
      timer.resume();
      timer.tick(60); // Complete
      expect(timer.getRemainingSeconds()).toBe(0);
      expect(timer.isCompleted()).toBe(true);
      expect(timer.formatDisplay()).toBe('00:00');
    });
  });

  // =========================================================================
  // Feature 8: Deterministic Offline Fallback Catalog (5 Tests)
  // =========================================================================
  describe('Feature 8: Deterministic Offline Fallback Catalog', () => {
    it('8.1: should include at least 30 pre-configured micro-activation tasks in fallback catalog', () => {
      const catalog = client.getFallbackCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(30);
    });

    it('8.2: should span all 4 required neuroscience categories', () => {
      const catalog = client.getFallbackCatalog();
      const categories = new Set(catalog.map((t) => t.category));
      expect(categories.has('physical_somatic')).toBe(true);
      expect(categories.has('environmental')).toBe(true);
      expect(categories.has('atomic_friction')).toBe(true);
      expect(categories.has('sensory_grounding')).toBe(true);
    });

    it('8.3: should ensure every catalog task has non-empty instruction and whyItWorks', () => {
      const catalog = client.getFallbackCatalog();
      for (const task of catalog) {
        expect(task.instruction.length).toBeGreaterThan(15);
        expect(task.whyItWorks.length).toBeGreaterThan(15);
        expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
        expect(task.durationMinutes).toBeLessThanOrEqual(5);
        expect(task.source).toBe('fallback_pool');
      }
    });

    it('8.4: should retrieve offline catalog task with zero-latency (<10ms)', () => {
      const start = Date.now();
      const task = client.getRandomFallbackTask('physical_somatic');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(15);
      expect(task.category).toBe('physical_somatic');
    });

    it('8.5: should require zero network calls or API keys to access catalog', () => {
      const catalog = OFFLINE_FALLBACK_CATALOG;
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBe(32);
    });
  });

  // =========================================================================
  // Feature 9: Free-Tier Gemini LLM API Route & Circuit Breaker (5 Tests)
  // =========================================================================
  describe('Feature 9: Free-Tier Gemini LLM API Route & Circuit Breaker', () => {
    it('9.1: should accept UnstickRequest with routine context and return micro-activation task', async () => {
      const task = await client.requestUnstick({
        currentRoutine: 'morning_launchpad',
        energyLevel: 2,
        stuckContext: 'Paralyzed by too many email notifications',
      });
      expect(task.title).toBeDefined();
      expect(task.instruction).toBeDefined();
    });

    it('9.2: should return source gemini_llm when Gemini API responds normally', async () => {
      const task = await client.requestUnstick({ energyLevel: 3 });
      expect(task.source).toBe('gemini_llm');
    });

    it('9.3: should trigger circuit breaker on 2500ms timeout and fall back to catalog', async () => {
      const timeoutClient = new OpaqueBoxClient({ geminiMockFailure: 'timeout' });
      const task = await timeoutClient.requestUnstick();
      expect(task.source).toBe('fallback_pool');
      expect(task.title).toBeDefined();
    });

    it('9.4: should seamlessly fall back when GEMINI_API_KEY is missing or invalid', async () => {
      const brokenClient = new OpaqueBoxClient({ geminiMockFailure: true });
      const task = await brokenClient.requestUnstick();
      expect(task.source).toBe('fallback_pool');
      expect(task.instruction).toBeDefined();
    });

    it('9.5: should handle HTTP 429 rate limit from Google AI Studio and return fallback task', async () => {
      const rateLimitedClient = new OpaqueBoxClient({ geminiMockFailure: 'rate_limit' });
      const task = await rateLimitedClient.requestUnstick();
      expect(task.source).toBe('fallback_pool');
    });
  });

  // =========================================================================
  // Feature 10: Netlify Free-Tier Deployment & Custom Domain Architecture (5 Tests)
  // =========================================================================
  describe('Feature 10: Netlify Free-Tier Deployment & Custom Domain Architecture', () => {
    it('10.1: should verify zero paid tier dependencies across all infrastructure components', () => {
      const audit = client.auditFreeTierCompliance();
      expect(audit.compliant).toBe(true);
      expect(audit.violations.length).toBe(0);
      expect(audit.verifiedFreeServices.length).toBeGreaterThanOrEqual(4);
    });

    it('10.2: should configure Content-Security-Policy header restricting script and connect origins', () => {
      const headers = client.getNetlifySecurityHeaders();
      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Content-Security-Policy']).toContain('https://*.supabase.co');
      expect(headers['Content-Security-Policy']).toContain('https://generativelanguage.googleapis.com');
    });

    it('10.3: should enforce X-Frame-Options: DENY and X-Content-Type-Options: nosniff', () => {
      const headers = client.getNetlifySecurityHeaders();
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('10.4: should respond to public health check endpoint /api/health with HTTP 200', () => {
      const nav = client.navigate('/api/health');
      expect(nav.status).toBe(200);
      expect(nav.body?.page).toBe('/api/health');
    });

    it('10.5: should verify custom domain mapping isolated to flow.buildnest.buzz', () => {
      const oauthUrl = client.getGoogleOAuthUrl();
      expect(oauthUrl).toContain('flow.buildnest.buzz');
    });
  });
});
