/**
 * Tier 3: Cross-Feature Combinations E2E Tests
 * Validates pairwise subsystem interactions, multi-feature workflows, and defense-in-depth handoffs.
 */

import { describe, it, expect, beforeEach } from './harness/test-runner.ts';
import { OpaqueBoxClient } from './harness/opaque-box-harness.ts';

describe('Tier 3: Cross-Feature Combinations Suite (10 Tests)', () => {
  let client: OpaqueBoxClient;

  beforeEach(() => {
    client = new OpaqueBoxClient({
      whitelistTable: ['whitelisted-founder@buildnest.buzz', 'collab@buildnest.buzz'],
      whitelistEnv: ['admin-emergency@buildnest.buzz'],
      geminiMockLatencyMs: 15,
    });
  });

  it('3.1: Google OAuth + Whitelist Gatekeeper (Approved User Journey)', async () => {
    // 1. Initiate OAuth
    const authUrl = client.getGoogleOAuthUrl();
    expect(authUrl).toContain('client_id=');

    // 2. Exchange token on callback
    const callbackRes = await client.handleOAuthCallback('oauth-code-456', 'csrf-test-token', 'whitelisted-founder@buildnest.buzz');
    expect(callbackRes.status).toBe(307);
    expect(callbackRes.location).toBe('/dashboard');
    expect(callbackRes.session?.isWhitelisted).toBe(true);

    // 3. Navigate to protected dashboard using session
    const nav = client.navigate('/dashboard', {
      cookies: { 'sb-access-token': callbackRes.session!.accessToken },
    });
    expect(nav.status).toBe(200);
    expect(nav.body?.user).toBe('whitelisted-founder@buildnest.buzz');
  });

  it('3.2: Google OAuth + Whitelist Interceptor (Uninvited Rejection & Token Revocation)', async () => {
    // 1. Uninvited user completes Google consent
    const callbackRes = await client.handleOAuthCallback('oauth-code-789', 'csrf-test-token', 'uninvited-guest@gmail.com');
    
    // 2. Boundary 2 interceptor revokes session and redirects to login with not_whitelisted error
    expect(callbackRes.status).toBe(307);
    expect(callbackRes.location).toBe('/login?error=not_whitelisted');
    expect(callbackRes.session).toBeUndefined();

    // 3. User attempts direct navigation to dashboard -> intercepted by Edge Middleware (Boundary 1)
    const nav = client.navigate('/dashboard');
    expect(nav.status).toBe(307);
    expect(nav.location).toContain('/login?redirect=');
  });

  it('3.3: Morning Launchpad + "Unstick Me" Panic Button Integration', async () => {
    // 1. User starts Morning Launchpad with low energy (Level 2)
    const session = client.startRoutineSession('morning_launchpad', '2026-11-15', 2);
    expect(session.energyLevel).toBe(2);

    // 2. User feels overwhelmed trying to select Keystone and clicks Panic button
    const unstickTask = await client.requestUnstick({
      currentRoutine: 'morning_launchpad',
      energyLevel: session.energyLevel,
      stuckContext: 'Too tired to choose my priority task',
    });

    expect(unstickTask.title).toBeDefined();
    expect(unstickTask.durationMinutes).toBeGreaterThanOrEqual(2);
    expect(unstickTask.durationMinutes).toBeLessThanOrEqual(5);

    // 3. User runs countdown timer for micro-activation
    const timer = client.createCountdownTimer(unstickTask.durationMinutes);
    timer.start();
    timer.tick(unstickTask.durationMinutes * 60);
    expect(timer.isCompleted()).toBe(true);

    // 4. Inertia broken: User returns to Morning Launchpad and designates Keystone task
    const keystone = client.createTask('morning_launchpad', 'Write Project Specification', 'keystone', 60, '2026-11-15');
    expect(keystone.priority).toBe('keystone');
    expect(keystone.status).toBe('todo');
  });

  it('3.4: Day Momentum Focus Sprint + Keystone Priority + Panic Button Recovery', async () => {
    // 1. Start Day Momentum Block
    client.startRoutineSession('day_momentum', '2026-11-15');
    const task = client.createTask('day_momentum', 'Implement Core Logic', 'keystone', 90, '2026-11-15');
    client.updateTaskStatus(task.id, 'in_progress');

    // 2. User gets stuck in middle of sprint and triggers panic button
    const panicTask = await client.requestUnstick({
      currentRoutine: 'day_momentum',
      energyLevel: 3,
      stuckContext: 'Hit a wall on algorithm design',
    });
    expect(panicTask).toBeDefined();

    // 3. Execute 2-minute micro-activation timer
    const timer = client.createCountdownTimer(2);
    timer.start();
    timer.tick(120);
    expect(timer.isCompleted()).toBe(true);

    // 4. Momentum regained: finish task
    const completedTask = client.updateTaskStatus(task.id, 'done');
    expect(completedTask.status).toBe('done');
  });

  it('3.5: Gemini LLM Circuit Breaker + Offline Fallback + Routine Session Persistence', async () => {
    // 1. Configure client with Gemini network timeout failure (>2500ms)
    const timeoutClient = new OpaqueBoxClient({ geminiMockFailure: 'timeout' });

    // 2. Request unstick task
    const startTime = Date.now();
    const task = await timeoutClient.requestUnstick({
      currentRoutine: 'day_momentum',
      energyLevel: 1,
    });
    const elapsed = Date.now() - startTime;

    // 3. Verify circuit breaker degraded to fallback pool with valid metadata
    expect(elapsed).toBeGreaterThanOrEqual(2500);
    expect(task.source).toBe('fallback_pool');
    expect(['physical_somatic', 'environmental', 'atomic_friction', 'sensory_grounding']).toContain(task.category);
    expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
  });

  it('3.6: Evening Shutdown + Rule of 3 Incomplete Task Deferral', () => {
    // 1. Setup day's tasks: 1 Keystone done, 1 Secondary done, 1 Secondary incomplete
    const k = client.createTask('morning_launchpad', 'Keystone Milestone', 'keystone', 60, '2026-11-15');
    const s1 = client.createTask('morning_launchpad', 'Clean Test Runner', 'secondary', 30, '2026-11-15');
    const s2 = client.createTask('morning_launchpad', 'Update Documentation', 'secondary', 30, '2026-11-15');

    client.updateTaskStatus(k.id, 'done');
    client.updateTaskStatus(s1.id, 'done');

    // 2. Begin Evening Shutdown
    client.startRoutineSession('evening_shutdown', '2026-11-15');

    // 3. Non-judgmental loop closure: defer unfinished secondary task to next day
    const deferred = client.updateTaskStatus(s2.id, 'deferred');
    expect(deferred.status).toBe('deferred');

    // 4. Complete evening session with reflection note
    const session = client.completeRoutineSession(
      'evening_shutdown',
      '2026-11-15',
      'Completed Keystone and 1 secondary; deferred docs to tomorrow without guilt.'
    );
    expect(session.status).toBe('completed');
    expect(session.reflectionNotes).toContain('deferred docs to tomorrow without guilt');
  });

  it('3.7: Dynamic Whitelist Revocation Mid-Session (Session Invalidation)', async () => {
    // 1. Whitelisted user signs in
    client.addToDbWhitelist('temporary-member@buildnest.buzz');
    client.seedUser('temporary-member@buildnest.buzz', 'Password123!', 'user-temp');
    const auth = await client.signInWithPassword('temporary-member@buildnest.buzz', 'Password123!');
    expect(auth.success).toBe(true);

    // 2. User accesses dashboard successfully
    const nav1 = client.navigate('/dashboard', {
      cookies: { 'sb-access-token': auth.session!.accessToken },
    });
    expect(nav1.status).toBe(200);

    // 3. Admin revokes email from whitelist
    client.removeFromDbWhitelist('temporary-member@buildnest.buzz');

    // 4. Next navigation intercepts and redirects to /access-denied
    const nav2 = client.navigate('/dashboard', {
      cookies: { 'sb-access-token': auth.session!.accessToken },
    });
    expect(nav2.status).toBe(307);
    expect(nav2.location).toBe('/access-denied');

    // 5. API call also rejected with HTTP 403 Forbidden
    const apiNav = client.navigate('/api/unstick', {
      cookies: { 'sb-access-token': auth.session!.accessToken },
    });
    expect(apiNav.status).toBe(403);
  });

  it('3.8: Multi-Unstick Sequential Chaining (Varied Suggestions)', async () => {
    // 1. User gets first unstick task (e.g. physical_somatic)
    const task1 = client.getRandomFallbackTask('physical_somatic');
    expect(task1.category).toBe('physical_somatic');

    // 2. User completes task1, but still feels inertia; requests another micro-step with different focus
    const task2 = client.getRandomFallbackTask('atomic_friction');
    expect(task2.category).toBe('atomic_friction');
    expect(task1.id).not.toBe(task2.id);

    // 3. Both tasks meet 2-to-5 minute requirement
    expect(task1.durationMinutes).toBeGreaterThanOrEqual(2);
    expect(task2.durationMinutes).toBeGreaterThanOrEqual(2);
  });

  it('3.9: Database Outage with Dual Whitelist Fallback to Environment Configuration', async () => {
    // 1. Simulate empty database whitelist (database unreachable / empty)
    const outageClient = new OpaqueBoxClient({
      whitelistTable: [], // DB table unavailable
      whitelistEnv: ['admin-emergency@buildnest.buzz'], // Env variable intact
    });

    // 2. Emergency admin attempts access -> resolved via env fallback
    const checkAdmin = await outageClient.checkWhitelist('admin-emergency@buildnest.buzz');
    expect(checkAdmin.isWhitelisted).toBe(true);
    expect(checkAdmin.reason).toBe('whitelisted_env');

    // 3. Non-whitelisted user is still rejected
    const checkStranger = await outageClient.checkWhitelist('stranger@outside.com');
    expect(checkStranger.isWhitelisted).toBe(false);
    expect(checkStranger.reason).toBe('not_whitelisted');
  });

  it('3.10: Session Expiry During Active Day Momentum Sprint with Route Interception', async () => {
    // 1. User signs in and starts routine
    client.seedUser('collab@buildnest.buzz', 'Password123!', 'user-collab');
    const auth = await client.signInWithPassword('collab@buildnest.buzz', 'Password123!');
    expect(auth.success).toBe(true);

    client.startRoutineSession('day_momentum', '2026-11-15');
    client.createTask('day_momentum', 'Sprint Task', 'keystone', 45, '2026-11-15');

    // 2. Session expires mid-sprint
    auth.session!.expiresAt = Date.now() - 1000;

    // 3. User navigates to dashboard -> intercepted with redirect query preserving target
    const nav = client.navigate('/dashboard', {
      cookies: { 'sb-access-token': auth.session!.accessToken },
    });
    expect(nav.status).toBe(307);
    expect(nav.location).toBe('/login?redirect=%2Fdashboard');

    // 4. User re-authenticates and session is renewed
    auth.session!.expiresAt = Date.now() + 3600 * 1000;
    const postLoginNav = client.navigate('/dashboard', {
      cookies: { 'sb-access-token': auth.session!.accessToken },
    });
    expect(postLoginNav.status).toBe(200);
  });
});
