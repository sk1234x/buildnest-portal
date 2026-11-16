# Flow E2E Test Infrastructure & Specification (`TEST_INFRA.md`)

## 1. Executive Summary & Philosophy
The Flow E2E Test Suite provides autonomous, requirement-driven, opaque-box verification for the **Flow Authenticated Activity Planner** (`flow.buildnest.buzz`). 

Deriving directly from `ORIGINAL_REQUEST.md` and `PROJECT.md`, the test infrastructure strictly exercises the system from the perspective of an end user, browser client, and edge network consumer. It validates all features and defense-in-depth security boundaries without coupling to internal implementation mechanics.

### Core Testing Tenets:
1. **Opaque-Box Verification**: Tests interact strictly through public interfaces, HTTP endpoints, SSR middleware redirects, cookies, and documented interface contracts (`PROJECT.md § Interface Contracts`).
2. **Deterministic & Hermetic Execution**: External network boundaries (Supabase PostgreSQL/Auth, Google OAuth, and Google AI Studio Gemini API) are handled with deterministic protocol-level test harnesses, ensuring 100% offline reproducibility and zero flaky cloud timeouts.
3. **Defense-in-Depth Enforcement**: Every security tier (SSR Edge Middleware 307 redirects, OAuth token revocation, Whitelist dual-fallback resolution, and API authorization guards) is validated against adversarial attempts.
4. **Progressive Testability**: The test suite is organized into 4 distinct tiers, allowing incremental validation across development milestones while standing ready as the final gatekeeper for Milestone 6.

---

## 2. 4-Tier Test Architecture

```
+-----------------------------------------------------------------------+
|             Tier 4: Real-World Application Scenarios (5)              |
|        Full user lifecycles: Procrastination breakthrough, rejected   |
|        uninvited visitor, degraded network panic, multi-day momentum  |
+-----------------------------------------------------------------------+
|             Tier 3: Cross-Feature Combinations (10)                   |
|        Pairwise interactions: OAuth + Whitelist, Morning + Panic,     |
|        Day Momentum + Keystone, Circuit Breaker + Session Logging     |
+-----------------------------------------------------------------------+
|             Tier 2: Boundary & Corner Cases (35)                      |
|        Auth boundaries, whitelist edge cases, token expiration,       |
|        2500ms circuit breaker timeout, Rule of 3 limits, timer edges  |
+-----------------------------------------------------------------------+
|             Tier 1: Feature Coverage (50)                             |
|        ≥5 tests per feature covering all 10 core features across      |
|        Auth, Whitelist, Routines, Keystone, Panic Button, & Hosting   |
+-----------------------------------------------------------------------+
```

### Tier Breakdown & Feature Mapping

| Tier | Category | Target Scope | Test Count | Target File |
|------|----------|--------------|------------|-------------|
| **Tier 1** | Feature Coverage | ≥5 tests each across all 10 core features | 50 | `flow/tests/e2e/tier1-features.test.ts` |
| **Tier 2** | Boundary & Corner Cases | Token expiry, edge redirects, rate limits, 2.5s timeouts, boundary inputs | 35 | `flow/tests/e2e/tier2-boundaries.test.ts` |
| **Tier 3** | Cross-Feature Combinations | Pairwise subsystems (OAuth + Whitelist, Launchpad + Panic, Deferral + Seeding) | 10 | `flow/tests/e2e/tier3-cross-feature.test.ts` |
| **Tier 4** | Real-World Application Scenarios | Complete end-to-end user journeys from dawn planning to evening shutdown | 5 | `flow/tests/e2e/tier4-scenarios.test.ts` |
| **Total** | **Comprehensive E2E Suite** | **Tiers 1 through 4 Complete** | **100** | **`flow/tests/e2e/`** |

---

## 3. Directory Layout & Organization

The E2E test suite resides inside `/Volumes/Mac Storage/AntiGravity-HDD/Buildnest/flow/tests/e2e/`:

```
flow/tests/e2e/
├── harness/
│   ├── test-contracts.ts        # TypeScript schemas and interface contracts matching PROJECT.md
│   ├── opaque-box-harness.ts    # Opaque-box client simulator, reference oracle, & boundary mock
│   └── test-runner.ts           # Unified test runner adapter (Vitest & Node.js test runner)
├── tier1-features.test.ts       # Tier 1: 50 Feature Coverage tests (10 features x 5)
├── tier2-boundaries.test.ts     # Tier 2: 35 Boundary & Corner Case tests
├── tier3-cross-feature.test.ts  # Tier 3: 10 Pairwise Cross-Feature tests
└── tier4-scenarios.test.ts      # Tier 4: 5 Real-World End-to-End User Journeys
```

---

## 4. Test Harness & Contract Architecture

### Interface Contracts Enforced
All tests assert against the formal interface contracts defined in `PROJECT.md § Interface Contracts`:

1. **Auth & Whitelist Gatekeeper (`lib/auth/whitelist.ts`)**:
   - `WhitelistCheckResult`: `{ isWhitelisted: boolean, email: string | null, reason?: 'whitelisted_db' | 'whitelisted_env' | 'not_whitelisted' | 'unauthenticated' }`
   - `isEmailWhitelisted(email: string | null | undefined): Promise<boolean>`
   - `assertAuthenticatedAndWhitelisted(): Promise<{ userId: string; email: string }>`

2. **Routine Planning (`lib/routines/types.ts`)**:
   - `RoutineSlug`: `'morning_launchpad' | 'day_momentum' | 'evening_shutdown'`
   - `RoutineStatus`: `'pending' | 'in_progress' | 'completed' | 'skipped'`
   - `RoutineSession`: `{ id, userId, sessionDate, routineSlug, status, energyLevel, keystoneFocus, reflectionNotes }`
   - `TaskItem`: `{ id, userId, routineSlug, title, priority: 'keystone' | 'secondary' | 'backlog', status, estimatedMinutes }`

3. **"Unstick Me" Panic Engine (`lib/unstick/types.ts`)**:
   - `MicroActivationCategory`: `'physical_somatic' | 'environmental' | 'atomic_friction' | 'sensory_grounding'`
   - `MicroActivationTask`: `{ id, title, instruction, durationMinutes (2-5), category, whyItWorks, source }`
   - `UnstickRequest`: `{ currentRoutine?, energyLevel?, stuckContext? }`
   - Endpoint: `POST /api/unstick` with 2,500ms `AbortController` circuit breaker and fallback pool degradation.

---

## 5. Execution Instructions

The test suite is designed to execute using standard tooling:

### Primary Execution (Vitest):
```bash
cd "/Volumes/Mac Storage/AntiGravity-HDD/Buildnest/flow"
npx vitest run tests/e2e
```

### Standalone / Hermetic Execution (Node.js Native Runner):
```bash
cd "/Volumes/Mac Storage/AntiGravity-HDD/Buildnest/flow"
node --test tests/e2e/*.test.ts
```

### Running Individual Tiers:
```bash
# Tier 1 Feature Coverage
node --test tests/e2e/tier1-features.test.ts

# Tier 2 Boundary & Corner Cases
node --test tests/e2e/tier2-boundaries.test.ts

# Tier 3 Cross-Feature Combinations
node --test tests/e2e/tier3-cross-feature.test.ts

# Tier 4 Real-World Application Scenarios
node --test tests/e2e/tier4-scenarios.test.ts
```

---

## 6. Defect Escalation Protocol

When tests fail against implementation code:
1. **QA Boundary**: Test writers do NOT modify application code (`flow/src/**`).
2. **Escalation Record**: Log failure verbatim in test reports including:
   - Failing test name and tier
   - Observed response (status code, headers, payload) vs. expected specification
   - Relevant requirement reference (`ORIGINAL_REQUEST.md` or `PROJECT.md`)
3. **Implementation Ticket**: Send escalation message to the responsible Milestone worker agent or sub-orchestrator.
