# Project: Flow — Authenticated Activity Planner Prototype

## Architecture
Flow is an exploratory prototype of an authenticated activity planner web application engineered to build routine, overcome procrastination, and eliminate executive dysfunction paralysis, deployed to `flow.buildnest.buzz`.

### High-Level Architecture
- **Framework**: Next.js 15+ (App Router) with React 19, TypeScript, and Tailwind CSS in `/Volumes/Mac Storage/AntiGravity-HDD/Buildnest/flow`.
- **Runtime & Tooling**: Node.js `v25.8.0`, standardized strictly on `npm`, with `vitest` for automated testing.
- **Auth & Backend**: Supabase Free Tier (PostgreSQL, PostgREST HTTPS API, Supabase Auth with `@supabase/ssr` cookies).
  - Google OAuth integrated under the `buildnest.buzz` Google Cloud project (`DriveStream` - "In Production" status, 100-user unverified cap, eliminating 7-day token expiration).
  - Email & Password authentication with secure session cookies.
- **Security & Whitelist Boundary (Defense-in-Depth)**:
  - **Boundary 1 (SSR Edge Middleware)**: Next.js `middleware.ts` intercepts all requests before rendering. Unauthenticated or non-whitelisted users are immediately redirected (HTTP 307) or blocked (HTTP 401/403) before any React Server Component (RSC) payload or private UI code chunk is emitted.
  - **Boundary 2 (OAuth Callback Interceptor)**: `/auth/callback` verifies whitelist access upon token exchange; if non-whitelisted, immediately forces `supabase.auth.signOut()` and redirects to `/login?error=not_whitelisted`.
  - **Boundary 3 (Server Action & API Guard)**: `assertAuthenticatedAndWhitelisted()` helper asserting valid session and whitelist status on every backend mutation and API route (`/api/unstick`).
  - **Boundary 4 (Database RLS)**: PostgreSQL Row Level Security on all application tables (`anchor_routines`, `daily_routine_sessions`, `tasks`, `micro_activations`) checking `is_email_whitelisted()`.
  - **Boundary 5 (Storage Dual Fallback)**: Whitelist stored in `public.whitelist` table with fallback/seed from `WHITELIST_EMAILS` environment variable.
- **Core Activity Planner Engine**:
  - **3 Daily Anchor Routines**: Replaces rigid 24h time-blocking with circadian momentum scaffolding:
    1. *Morning Launchpad*: Low-friction ramp-up, energy check-in (1-5), and Single Keystone Focus selection + up to 2 secondary tasks (Rule of 3).
    2. *Day Momentum Block*: Single-task focus sprint view, Pomodoro pacing, real-time logging, and instant panic action.
    3. *Evening Shutdown*: Micro-wins review, guilt-free deferral/rescheduling, setting tomorrow's anchor, and loop closure.
  - **"Unstick Me" Panic Button**: Single-tap action bypassing planning to instantly open a focused modal with a 2-to-5 minute countdown timer for a single micro-activation task.
  - **Gemini Free-Tier LLM Integration**: Protected server-side route `/api/unstick` invoking Google AI Studio Gemini 1.5 Flash (15 RPM / 1,500 RPD free tier) with structured JSON output, wrapped in a 2.5-second `AbortController` circuit breaker.
  - **Deterministic 30+ Offline Fallback Catalog**: Zero-latency (<10ms) somatic/environmental/friction/grounding micro-tasks automatically served when the LLM is unconfigured, slow, or rate-limited.
- **Free-Tier Hosting & Deployment**:
  - Hosted on **Netlify Free Tier** (`flow/netlify.toml`, `base = "flow"`) with custom domain `flow.buildnest.buzz` mapped via Spaceship Advanced DNS CNAME.
  - Strict security headers: CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy.
  - Zero paid dependencies ($0.00/month, no Firebase Blaze).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Subfolder Workspace & Monorepo Setup | Scaffold Next.js App Router in `flow/`, configure root & app `.gitignore`, TypeScript, Tailwind CSS, and Vitest test runner. | M1 | Survey (Explorer 1) |
| 2 | Supabase SSR Cookie Client Infrastructure | Configure `@supabase/ssr` with safe cookie handlers for Middleware, Server Components, and Route Handlers. | M2 | Survey (Explorer 2) |
| 3 | SSR Edge Middleware Gatekeeper | Intercept requests to private routes (`/dashboard`, `/routines`, `/unstick`, `/api/*`) and enforce server-side 307 redirects before any private code chunk or RSC payload is transmitted. | M2 | R2, Survey (Explorer 2) |
| 4 | Google OAuth Sign-In | Support Google OAuth sign-in using `buildnest.buzz` Google Cloud configuration ("In Production" verified umbrella). | M2 | R2, Survey (Explorer 2) |
| 5 | Email & Password Sign-In | Provide email/password authentication forms with validation and session management. | M2 | R2, Survey (Explorer 2) |
| 6 | Whitelist Access Control Enforcement | Restrict access to invited/whitelisted users (via `public.whitelist` table & `WHITELIST_EMAILS` env fallback); reject non-whitelisted users and revoke sessions at callback. | M2 | R2, Survey (Explorer 2) |
| 7 | Access Denied & Public Auth UI | Public `/login` and `/access-denied` pages with clear user feedback and zero leaks of protected UI logic. | M2 | R2, Survey (Explorer 2) |
| 8 | 3 Daily Anchor Routines Core Model | Morning Launchpad, Day Momentum Block, and Evening Shutdown routine data models and session state machines. | M3 | R1, Survey (Explorer 3) |
| 9 | Keystone Focus & Rule of 3 Task Management | Daily selection of 1 Keystone focus task and up to 2 secondary tasks to structure effort without rigid hourly schedules. | M3 | R1, Survey (Explorer 3) |
| 10 | Interactive Routine Execution UI | Fluid UI for completing routine check-ins, sprint timers, micro-win celebrations, and evening loop closure. | M3 | R1, Survey (Explorer 3) |
| 11 | "Unstick Me" Panic Button Modal & Timer | Prominent 1-click panic button surfacing a single 2-5 min micro-activation task with circular countdown timer. | M4 | R1, Survey (Explorer 3) |
| 12 | Deterministic 30+ Offline Fallback Catalog | Curated neuroscience-backed micro-tasks (Physical, Environmental, Atomic Friction, Grounding) delivering <10ms zero-latency response. | M4 | R1, Survey (Explorer 3) |
| 13 | Free-Tier Gemini LLM API Route | Server-side `/api/unstick` integrating Gemini 1.5 Flash structured JSON output for dynamic, empathetic micro-activation tasks. | M4 | R1, Survey (Explorer 3) |
| 14 | Resilient Circuit Breaker & Timeout Fallback | 2,500ms AbortController timeout on Gemini API calls seamlessly degrading to offline catalog on timeout, rate-limit, or missing key. | M4 | R1, Survey (Explorer 3) |
| 15 | Free-Tier Netlify Deployment Configuration | `flow/netlify.toml` configuring SSR adapter, build commands, and security headers (CSP, Frame-Options, nosniff). | M5 | R3, Survey (Explorer 3) |
| 16 | Spaceship Custom Domain Mapping | Documentation and CNAME configuration mapping `flow.buildnest.buzz` to Netlify without disturbing apex domain or Zoho email. | M5 | R3, Survey (Explorer 1, 3) |
| 17 | Zero-Paid Tier Verification & Audit | Strict verification that zero paid tier services (no Firebase Blaze) are required or referenced. | M5 | R3, Acceptance Criteria |
| 18 | Automated Unit & Integration Test Suite | Automated Vitest test suite for auth flows, whitelist access, route protection, anchor routines, and panic button logic. | M1-M5, M6 | R4, Acceptance Criteria |
| 19 | Requirement-Driven Opaque-Box E2E Test Suite | 4-Tier test suite (Feature Coverage, Boundary/Corner, Cross-Feature, Application Scenarios) published by E2E Testing Track. | E2E Track, M6 | R4, Acceptance Criteria |
| 20 | Adversarial Coverage Hardening (Tier 5) | White-box stress testing, gap analysis, and edge-case hardening with Challenger -> Worker -> Reviewer loop. | M6 (Phase 2) | Project Pattern |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Project Scaffold, Tooling & Test Baseline | Dual `.gitignore` (root and `flow/`), Next.js 15+ App Router, Tailwind CSS, TypeScript, Vitest test runner setup, and base layout. | none | DONE |
| M2 | Auth, Whitelist Gatekeeper & Supabase SSR Boundary | Supabase SSR cookie helpers, server Edge `middleware.ts` 307 redirects, Whitelist enforcement (`public.whitelist` & `WHITELIST_EMAILS`), Google OAuth & Email/Password UI, `/auth/callback` interceptor, and auth unit tests. | M1 | DONE |
| M3 | Core Routine Planning & Interactive Daily Anchors | Morning Launchpad, Day Momentum Block, Evening Shutdown routine models, Keystone Focus (Rule of 3), task tracking, session persistence, and routine unit tests. | M2 | DONE |
| M4 | "Unstick Me" Panic Button & Resilient Gemini LLM | 1-click panic button, 2-5 min circular countdown timer, 30+ item offline fallback catalog, `/api/unstick` server route with Gemini 1.5 Flash structured output and 2.5s AbortController circuit breaker, and integration tests. | M3 | DONE |
| M5 | Free-Tier Netlify Hosting & Custom Domain Deployment | `netlify.toml` with SSR configuration and security headers, Spaceship DNS CNAME documentation for `flow.buildnest.buzz`, zero-paid tier audit, and production build verification. | M4 | DONE |
| M6 | Final Milestone: 100% E2E Test Pass & Adversarial Hardening | Phase 1: Pass 100% of Tiers 1-4 E2E tests generated by E2E Testing Track. Phase 2: White-box adversarial coverage hardening (Tier 5) via Challenger -> Worker -> Reviewer loop. | M5, E2E Track | DONE |

In parallel:
- **E2E Testing Track**: Autonomous requirement-driven opaque-box test track creating test runner, Tiers 1-4 test cases, and publishing `TEST_READY.md`.

---

## Interface Contracts

### 1. Auth & Whitelist Gatekeeper Contract (`lib/auth/whitelist.ts`)
```typescript
export interface WhitelistCheckResult {
  isWhitelisted: boolean;
  email: string | null;
  reason?: 'whitelisted_db' | 'whitelisted_env' | 'not_whitelisted' | 'unauthenticated';
}

export function isEmailWhitelisted(email: string | null | undefined): Promise<boolean>;
export function assertAuthenticatedAndWhitelisted(): Promise<{ userId: string; email: string }>;
```

### 2. Routine Planning Contract (`lib/routines/types.ts`)
```typescript
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

export interface TaskItem {
  id: string;
  userId: string;
  routineSlug: RoutineSlug;
  title: string;
  priority: 'keystone' | 'secondary' | 'backlog';
  status: 'todo' | 'in_progress' | 'done' | 'deferred';
  estimatedMinutes: number;
  actualMinutes?: number;
}
```

### 3. "Unstick Me" Panic Button Contract (`lib/unstick/types.ts`)
```typescript
export type MicroActivationCategory =
  | 'physical_somatic'
  | 'environmental'
  | 'atomic_friction'
  | 'sensory_grounding';

export interface MicroActivationTask {
  id: string;
  title: string;
  instruction: string;
  durationMinutes: number; // 2 to 5
  category: MicroActivationCategory;
  whyItWorks: string;
  source: 'gemini_llm' | 'fallback_pool';
}

export interface UnstickRequest {
  currentRoutine?: RoutineSlug;
  energyLevel?: number; // 1 to 5
  stuckContext?: string;
}
```

---

## Code Layout
```
/Volumes/Mac Storage/AntiGravity-HDD/Buildnest/
├── .gitignore                     # Root gitignore (ignoring flow/node_modules, flow/.next, .DS_Store)
├── CNAME                          # Apex domain CNAME (buildnest.buzz)
├── docs/                          # Infrastructure documentation
└── flow/                          # Standalone Next.js Application
    ├── .env.example               # Template for NEXT_PUBLIC_SUPABASE_URL, etc.
    ├── .gitignore                 # App-level gitignore
    ├── netlify.toml               # Netlify Free Tier configuration & security headers
    ├── package.json               # Dependencies & scripts
    ├── tsconfig.json              # TypeScript configuration
    ├── tailwind.config.ts         # Tailwind CSS styling
    ├── vitest.config.ts           # Vitest configuration for unit/integration tests
    ├── middleware.ts              # Edge/SSR Middleware Gatekeeper (Boundary 1)
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx         # Root layout with Tailwind fonts & theme
    │   │   ├── page.tsx           # Landing page / redirection to dashboard or login
    │   │   ├── (auth)/
    │   │   │   ├── login/page.tsx # Public Auth UI (Email/Password & Google OAuth)
    │   │   │   └── access-denied/page.tsx # Whitelist rejection notice
    │   │   ├── auth/callback/route.ts # OAuth callback & whitelist interceptor
    │   │   ├── (protected)/
    │   │   │   ├── layout.tsx     # Protected app layout (nav, session header, panic FAB)
    │   │   │   ├── dashboard/page.tsx # Daily Anchor Routines overview
    │   │   │   ├── routines/
    │   │   │   │   ├── morning/page.tsx
    │   │   │   │   ├── momentum/page.tsx
    │   │   │   │   └── evening/page.tsx
    │   │   └── api/
    │   │       ├── unstick/route.ts   # Protected Gemini LLM endpoint with circuit breaker
    │   │       └── health/route.ts    # Public health check
    │   ├── components/
    │   │   ├── auth/              # Auth forms & Google OAuth button
    │   │   ├── routines/          # Routine cards, Keystone selector, Pomodoro sprint
    │   │   ├── unstick/           # "Unstick Me" modal, circular timer, sound chime
    │   │   └── ui/                # Reusable buttons, modals, badges, cards
    │   ├── lib/
    │   │   ├── supabase/          # Supabase client, server, and middleware helpers
    │   │   ├── auth/              # Whitelist validation & assertion helpers
    │   │   ├── routines/          # Routine state machine & task management
    │   │   └── unstick/           # Offline fallback catalog & Gemini LLM client
    └── tests/                     # Automated Vitest test suite
        ├── auth/                  # Middleware, whitelist, and callback tests
        ├── routines/              # Anchor routines & Keystone Rule of 3 tests
        ├── unstick/               # Panic button, timer, catalog & LLM circuit breaker tests
        └── e2e/                   # Opaque-box E2E test suites (Tiers 1-4)
```
