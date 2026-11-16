/**
 * Tier 4: Real-World Application Scenarios E2E Tests
 * Validates complete end-to-end user journeys and operational workflows.
 */

import { describe, it, expect, beforeEach } from './harness/test-runner.ts';
import { OpaqueBoxClient } from './harness/opaque-box-harness.ts';

describe('Tier 4: Real-World Application Scenarios Suite (5 Comprehensive Journeys)', () => {
  let client: OpaqueBoxClient;

  beforeEach(() => {
    client = new OpaqueBoxClient({
      whitelistTable: ['sarah.engineer@buildnest.buzz', 'alex.founder@buildnest.buzz'],
      whitelistEnv: ['lead.dev@buildnest.buzz'],
      geminiMockLatencyMs: 20,
    });
  });

  // =========================================================================
  // Scenario 1: The Procrastination Breakthrough Journey (Morning to Evening)
  // =========================================================================
  it('Scenario 4.1: The Procrastination Breakthrough Journey (Morning to Evening)', async () => {
    // Step 1: User signs in with email/password
    client.seedUser('sarah.engineer@buildnest.buzz', 'Password123!', 'user-sarah');
    const auth = await client.signInWithPassword('sarah.engineer@buildnest.buzz', 'Password123!');
    expect(auth.success).toBe(true);
    expect(auth.session?.isWhitelisted).toBe(true);

    // Step 2: Access dashboard via SSR Edge Middleware
    const navDashboard = client.navigate('/dashboard', {
      cookies: { 'sb-access-token': auth.session!.accessToken },
    });
    expect(navDashboard.status).toBe(200);

    // Step 3: Launch Morning Launchpad with low energy check-in (2/5)
    const morningSession = client.startRoutineSession('morning_launchpad', '2026-11-15', 2);
    expect(morningSession.status).toBe('in_progress');
    expect(morningSession.energyLevel).toBe(2);

    // Step 4: Establish Rule of 3 (1 Keystone + 2 Secondary)
    const keystone = client.createTask('morning_launchpad', 'Ship Prototype MVP', 'keystone', 60, '2026-11-15');
    const sec1 = client.createTask('morning_launchpad', 'Review Open PRs', 'secondary', 30, '2026-11-15');
    const sec2 = client.createTask('morning_launchpad', 'Draft Netlify Config', 'secondary', 20, '2026-11-15');
    expect(keystone.priority).toBe('keystone');
    expect(sec1.priority).toBe('secondary');
    expect(sec2.priority).toBe('secondary');

    // Step 5: Transition to Day Momentum Block and begin Keystone sprint
    const momentumSession = client.startRoutineSession('day_momentum', '2026-11-15');
    expect(momentumSession.status).toBe('in_progress');
    client.updateTaskStatus(keystone.id, 'in_progress');

    // Step 6: Hit procrastination block mid-sprint; trigger Panic Button
    const unstickTask = await client.requestUnstick({
      currentRoutine: 'day_momentum',
      energyLevel: 2,
      stuckContext: 'Executive freeze staring at blank file',
    });
    expect(unstickTask).toBeDefined();
    expect(unstickTask.durationMinutes).toBeGreaterThanOrEqual(2);
    expect(unstickTask.durationMinutes).toBeLessThanOrEqual(5);

    // Step 7: Run countdown timer for micro-activation
    const timer = client.createCountdownTimer(unstickTask.durationMinutes);
    timer.start();
    timer.tick(unstickTask.durationMinutes * 60);
    expect(timer.isCompleted()).toBe(true);
    expect(timer.formatDisplay()).toBe('00:00');

    // Step 8: Inertia broken; complete Keystone and 1 secondary task
    const finishedKeystone = client.updateTaskStatus(keystone.id, 'done');
    const finishedSec1 = client.updateTaskStatus(sec1.id, 'done');
    expect(finishedKeystone.status).toBe('done');
    expect(finishedSec1.status).toBe('done');

    // Step 9: Evening Shutdown; defer unfinished secondary task without guilt
    client.startRoutineSession('evening_shutdown', '2026-11-15');
    const deferredSec2 = client.updateTaskStatus(sec2.id, 'deferred');
    expect(deferredSec2.status).toBe('deferred');

    // Step 10: Complete evening loop closure and record reflection
    const eveningSession = client.completeRoutineSession(
      'evening_shutdown',
      '2026-11-15',
      'Overcame morning inertia with 3-minute reset; delivered Keystone prototype.'
    );
    expect(eveningSession.status).toBe('completed');
    expect(eveningSession.reflectionNotes).toContain('Overcame morning inertia');
  });

  // =========================================================================
  // Scenario 2: The Rejected Uninvited Visitor Security Journey (Defense-in-Depth)
  // =========================================================================
  it('Scenario 4.2: The Rejected Uninvited Visitor Security Journey (Defense-in-Depth)', async () => {
    // 1. Unauthenticated direct access to private routes blocked by SSR Edge Middleware
    const navDashboard = client.navigate('/dashboard');
    expect(navDashboard.status).toBe(307);
    expect(navDashboard.location).toBe('/login?redirect=%2Fdashboard');
    expect(navDashboard.leakedProtectedChunk).toBe(false);

    const navRoutines = client.navigate('/routines/morning');
    expect(navRoutines.status).toBe(307);
    expect(navRoutines.location).toBe('/login?redirect=%2Froutines%2Fmorning');

    // 2. Unauthenticated direct API call blocked with HTTP 401 Unauthorized
    const apiNav = client.navigate('/api/unstick');
    expect(apiNav.status).toBe(401);
    expect(apiNav.body?.error).toBe('Unauthorized');

    // 3. Attacker signs up with non-whitelisted email
    const reg = await client.signUpWithPassword('uninvited-stranger@gmail.com', 'SecurePass123!');
    expect(reg.success).toBe(true);
    expect(reg.session?.isWhitelisted).toBe(false);

    // 4. Authenticated non-whitelisted user navigating to /dashboard is blocked with 307 to /access-denied
    const deniedNav = client.navigate('/dashboard', {
      cookies: { 'sb-access-token': reg.session!.accessToken },
    });
    expect(deniedNav.status).toBe(307);
    expect(deniedNav.location).toBe('/access-denied');

    // 5. Attacker attempts Google OAuth sign-in -> OAuth callback interceptor denies and revokes session
    const oauthRes = await client.handleOAuthCallback('oauth-code-attacker', 'csrf-test-token', 'uninvited-stranger@gmail.com');
    expect(oauthRes.status).toBe(307);
    expect(oauthRes.location).toBe('/login?error=not_whitelisted');
    expect(oauthRes.session).toBeUndefined();

    // 6. Public /access-denied renders safely without exposing internal database structures
    const publicDenied = client.navigate('/access-denied');
    expect(publicDenied.status).toBe(200);
    expect(publicDenied.leakedProtectedChunk).toBe(false);
  });

  // =========================================================================
  // Scenario 3: The Degraded Network / Zero-Latency Offline Recovery Journey
  // =========================================================================
  it('Scenario 4.3: The Degraded Network / Zero-Latency Offline Recovery Journey', async () => {
    // 1. User is in low-connectivity environment; Gemini LLM hangs beyond 2.5s
    const offlineClient = new OpaqueBoxClient({
      geminiMockFailure: 'timeout',
      allowOfflineFallback: true,
    });

    // 2. User clicks Panic Button in state of acute stress
    const startReqTime = Date.now();
    const task = await offlineClient.requestUnstick({
      currentRoutine: 'day_momentum',
      energyLevel: 1,
      stuckContext: 'Network disconnected, cannot load task queue',
    });
    const duration = Date.now() - startReqTime;

    // 3. Circuit breaker safely aborts at 2,500ms and delivers fallback catalog task
    expect(duration).toBeGreaterThanOrEqual(2500);
    expect(task.source).toBe('fallback_pool');
    expect(task.durationMinutes).toBeGreaterThanOrEqual(2);
    expect(task.durationMinutes).toBeLessThanOrEqual(5);

    // 4. User runs offline countdown timer
    const timer = offlineClient.createCountdownTimer(task.durationMinutes);
    timer.start();
    timer.tick(task.durationMinutes * 60);
    expect(timer.isCompleted()).toBe(true);

    // 5. System stays operational with zero 500 error crashes
    const catalog = offlineClient.getFallbackCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(30);
  });

  // =========================================================================
  // Scenario 4: The Keystone Pivot & Guilt-Free Deferral Journey
  // =========================================================================
  it('Scenario 4.4: The Keystone Pivot & Guilt-Free Deferral Journey', () => {
    // 1. User starts day with Keystone task
    const originalKeystone = client.createTask(
      'morning_launchpad',
      'Write 20-Page Specification Document',
      'keystone',
      120,
      '2026-11-15'
    );
    expect(originalKeystone.priority).toBe('keystone');

    // 2. Urgent production issue occurs midday requiring immediate pivot
    const urgentIncident = client.createTask(
      'day_momentum',
      'Fix Critical Customer Authentication Bug',
      'keystone',
      45,
      '2026-11-15'
    );
    expect(urgentIncident.priority).toBe('keystone');

    // 3. Former Keystone was automatically demoted to secondary without losing progress
    expect(originalKeystone.priority).toBe('secondary');

    // 4. Complete the urgent incident Keystone task
    client.updateTaskStatus(urgentIncident.id, 'in_progress');
    client.updateTaskStatus(urgentIncident.id, 'done');

    // 5. Evening Shutdown provides guilt-free deferral of the large spec task
    client.startRoutineSession('evening_shutdown', '2026-11-15');
    const deferredSpec = client.updateTaskStatus(originalKeystone.id, 'deferred');
    expect(deferredSpec.status).toBe('deferred');

    // 6. Complete evening session with adaptive reflection
    const session = client.completeRoutineSession(
      'evening_shutdown',
      '2026-11-15',
      'Successfully triaged and resolved production issue; deferred long doc to tomorrow.'
    );
    expect(session.status).toBe('completed');
    expect(session.reflectionNotes).toContain('Successfully triaged');
  });

  // =========================================================================
  // Scenario 5: Multi-Day Momentum & Routine Continuity Journey
  // =========================================================================
  it('Scenario 4.5: Multi-Day Momentum & Routine Continuity Journey', () => {
    // --- Day 1 (2026-11-15) ---
    const day1Launch = client.startRoutineSession('morning_launchpad', '2026-11-15', 3);
    expect(day1Launch.sessionDate).toBe('2026-11-15');

    const day1Keystone = client.createTask('morning_launchpad', 'Build Day 1 Milestone', 'keystone', 60, '2026-11-15');
    const day1Secondary = client.createTask('morning_launchpad', 'Secondary Day 1 Task', 'secondary', 30, '2026-11-15');

    client.updateTaskStatus(day1Keystone.id, 'done');
    client.updateTaskStatus(day1Secondary.id, 'deferred');

    client.startRoutineSession('evening_shutdown', '2026-11-15');
    const day1Evening = client.completeRoutineSession('evening_shutdown', '2026-11-15', 'Solid Day 1 momentum.');
    expect(day1Evening.status).toBe('completed');

    // --- Day 2 (2026-11-16) ---
    const day2Launch = client.startRoutineSession('morning_launchpad', '2026-11-16', 4);
    expect(day2Launch.sessionDate).toBe('2026-11-16');
    expect(day2Launch.status).toBe('in_progress');

    // Verify Day 1 tasks are isolated by date
    const day1Tasks = client.getTasksForDate('2026-11-15');
    expect(day1Tasks.length).toBe(2);

    // Create Day 2 Keystone task
    const day2Keystone = client.createTask('morning_launchpad', 'Ship Day 2 Deliverables', 'keystone', 60, '2026-11-16');
    const day2Tasks = client.getTasksForDate('2026-11-16');
    expect(day2Tasks.length).toBe(1);
    expect(day2Keystone.priority).toBe('keystone');

    // Day 1 session remains intact and completed
    const retrievedDay1 = client.getRoutineSession('evening_shutdown', '2026-11-15');
    expect(retrievedDay1?.status).toBe('completed');
  });
});
