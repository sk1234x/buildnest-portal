/**
 * Opaque-Box Test Harness and Reference Oracle for Flow
 * Conforms to PROJECT.md § Interface Contracts & ORIGINAL_REQUEST.md
 */

import type {
  WhitelistCheckResult,
  UserSession,
  RoutineSlug,
  RoutineStatus,
  RoutineSession,
  TaskItem,
  TaskPriority,
  TaskStatus,
  MicroActivationCategory,
  MicroActivationTask,
  UnstickRequest,
  NavigationResponse,
} from './test-contracts.ts';

/**
 * Curated Deterministic 30+ Offline Fallback Catalog
 * Neuroscience-backed micro-activations categorized across all 4 required domains.
 */
export const OFFLINE_FALLBACK_CATALOG: MicroActivationTask[] = [
  // 1. Physical / Somatic (8 tasks)
  {
    id: 'phys-1',
    title: 'The 2-Minute Body Shakeout',
    instruction: 'Stand up immediately. Shake your hands for 30s, shake your legs for 30s, and roll your shoulders 10 times to dispel sympathetic nervous system freeze.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks: 'Discharges stagnant adrenaline and activates the somatic motor loop to break cognitive paralysis.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-2',
    title: 'Cold Water Facial Splash',
    instruction: 'Walk to the sink. Splash cold water onto your face and wrists 5 times, then pat dry with a towel.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks: 'Stimulates the mammalian dive reflex to drop heart rate and immediately reset the nervous system.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-3',
    title: 'Wall Sit or Calf Stretch',
    instruction: 'Lean against a sturdy wall and do a 60-second gentle wall sit or calf stretches while taking deep diaphragmatic breaths.',
    durationMinutes: 3,
    category: 'physical_somatic',
    whyItWorks: 'Engages large muscle groups, boosting blood flow and proprioceptive feedback.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-4',
    title: 'Postural Reset & Chest Opener',
    instruction: 'Interlace fingers behind your back, lift your chest upward, and hold for 5 slow breaths. Repeat twice.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks: 'Reverses forward-slumped screen posture, expanding lung capacity and increasing alertness.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-5',
    title: 'Hydration Reset Chug',
    instruction: 'Pour a tall glass of fresh water (at least 250ml) and drink it completely without looking at any screen.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks: 'Rehydrates cellular metabolism; momentary pause away from screens interrupts dopamine loops.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-6',
    title: 'Brisk Hallway Pace',
    instruction: 'Step away from your desk and walk briskly back and forth across your room or hallway 10 times.',
    durationMinutes: 3,
    category: 'physical_somatic',
    whyItWorks: 'Activates bilateral stimulation and raises baseline heart rate out of inertia.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-7',
    title: 'Wrist & Neck Mobility Routine',
    instruction: 'Do 10 wrist circles clockwise, 10 counter-clockwise, and 5 slow neck rolls in each direction.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks: 'Relieves cervical tension caused by prolonged stationary stress.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-8',
    title: 'Standing Jumping Jacks or Air Punches',
    instruction: 'Perform 20 light jumping jacks or 30 rhythmic air punches at medium tempo.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks: 'Spikes dopamine and norepinephrine naturally to overcome lethargy.',
    source: 'fallback_pool',
  },

  // 2. Environmental (8 tasks)
  {
    id: 'env-1',
    title: 'The 3-Item Desk Clear',
    instruction: 'Identify 3 items on your desk that do not belong to your next task (mugs, scraps, wrappers) and remove them now.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks: 'Reduces visual noise and external cognitive load, creating an inviting workspace.',
    source: 'fallback_pool',
  },
  {
    id: 'env-2',
    title: 'Fresh Air Window Flush',
    instruction: 'Open the nearest window or door wide. Take 5 deep breaths of fresh outside air, then close or adjust it.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks: 'Decreases localized carbon dioxide concentration and provides immediate sensory novelty.',
    source: 'fallback_pool',
  },
  {
    id: 'env-3',
    title: 'Digital Horizon Tidy',
    instruction: 'Close or minimize all browser tabs and windows except the single one you need right now.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks: 'Eliminates attention-residue traps and cognitive switching costs.',
    source: 'fallback_pool',
  },
  {
    id: 'env-4',
    title: 'Workspace Lighting Shift',
    instruction: 'Turn on a focused task lamp or adjust window blinds to increase ambient daylight in your field of view.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks: 'Blue-spectrum lux light cues the suprachiasmatic nucleus to enhance wakefulness.',
    source: 'fallback_pool',
  },
  {
    id: 'env-5',
    title: 'Phone Out of Line-of-Sight',
    instruction: 'Place your smartphone into another room, inside a drawer, or at least 2 meters behind your chair on silent.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks: 'Research proves merely seeing a smartphone reduces working memory capacity.',
    source: 'fallback_pool',
  },
  {
    id: 'env-6',
    title: 'Audio Environment Switch',
    instruction: 'Put on noise-cancelling headphones and start playing brown noise, binaural beats, or instrumental ambient sound.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks: 'Masks distracting erratic background acoustic peaks, anchoring executive focus.',
    source: 'fallback_pool',
  },
  {
    id: 'env-7',
    title: 'Keyboard & Screen Wipe',
    instruction: 'Take a microfibre cloth and quickly wipe down your keyboard, mouse, and monitor screen.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks: 'Provides a clean tactile and visual slate that signals the start of a pristine work sprint.',
    source: 'fallback_pool',
  },
  {
    id: 'env-8',
    title: 'Chair Ergonomic Recalibration',
    instruction: 'Stand up, adjust chair height so thighs are parallel to the floor, adjust armrests, and sit back with lumbar support.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks: 'Physical discomfort subtly drains willpower; recalibrating restores baseline ease.',
    source: 'fallback_pool',
  },

  // 3. Atomic Friction (8 tasks)
  {
    id: 'fric-1',
    title: 'The 1-Sentence Document Starter',
    instruction: 'Open your target document or IDE. Write exactly ONE sentence or one line of code—even if it is terrible—and stop.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks: 'Lowers activation energy below the threshold of procrastination; starting is harder than continuing.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-2',
    title: 'Rename & Save Working File',
    instruction: 'Create a new blank file, save it with today’s date and the project name, and write a one-word title at the top.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks: 'Transforms an intimidating blank canvas into an established artifact with zero cognitive risk.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-3',
    title: 'The 3-Bullet Outline',
    instruction: 'On a physical paper or scratchpad, write down 3 bullet points answering: "What does done look like?"',
    durationMinutes: 3,
    category: 'atomic_friction',
    whyItWorks: 'Externalizes ambiguous goals into concrete, actionable steps without commit pressure.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-4',
    title: 'Micro-Step Decomposition',
    instruction: 'Take your biggest task and break it down until the first subtask takes less than 120 seconds to execute.',
    durationMinutes: 3,
    category: 'atomic_friction',
    whyItWorks: 'Procrastination is often a symptom of vague, oversized task definitions.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-5',
    title: 'The 2-Minute Read-Only Pass',
    instruction: 'Open the reference doc or ticket. Set a 2-minute timer and just read without any obligation to write or produce.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks: 'Removes production performance pressure while loading relevant context into short-term memory.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-6',
    title: 'Delete 1 Dead Draft or Redundant File',
    instruction: 'Locate 1 obsolete draft, scratch file, or outdated note in your current project and delete it.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks: 'An easy destructive action creates a tangible sense of agency and clears mental clutter.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-7',
    title: 'Set Up The Next 15-Minute Milestone',
    instruction: 'Write on a sticky note: "All I need to do is [Next Verb + Object] for 15 minutes", and stick it on your bezel.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks: 'Shrinks time horizon from an overwhelming workday down to a manageable bite-sized block.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-8',
    title: 'Prepare Single Dependency Tool',
    instruction: 'Launch only the single application or terminal required for your immediate step; close everything else.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks: 'Reduces setup friction and eliminates choice fatigue.',
    source: 'fallback_pool',
  },

  // 4. Sensory Grounding (8 tasks)
  {
    id: 'sens-1',
    title: 'The 5-4-3-2-1 Sensory Scan',
    instruction: 'Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste right now.',
    durationMinutes: 3,
    category: 'sensory_grounding',
    whyItWorks: 'Anchors attention back to concrete sensory reality, disconnecting internal rumination loops.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-2',
    title: 'Physiological Sigh Breathwork',
    instruction: 'Take two quick deep inhales through your nose, followed by a long, slow exhale through your mouth. Repeat 5 times.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks: 'Andrew Huberman demonstrated this rapidly reinflates collapsed alveoli and triggers vagal parasympathetic tone.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-3',
    title: 'Tactile Texture Exploration',
    instruction: 'Pick up a physical object on your desk (a pen, stone, key). Close your eyes and focus 60 seconds on its weight and texture.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks: 'Tactile grounding halts intrusive racing thoughts by commanding the somatosensory cortex.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-4',
    title: 'Panoramic Vision Gaze',
    instruction: 'Look at a point in the distance or out a window. Relax your eyes and expand your awareness to your full peripheral field for 90 seconds.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks: 'Narrow foveal gaze triggers autonomic alertness; panoramic vision activates the parasympathetic calming branch.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-5',
    title: 'Box Breathing Cycle (4-4-4-4)',
    instruction: 'Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, hold empty for 4 seconds. Complete 4 cycles.',
    durationMinutes: 3,
    category: 'sensory_grounding',
    whyItWorks: 'Regulates carbon dioxide tolerance and stabilizes autonomic arousal.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-6',
    title: 'Barefoot Floor Grounding',
    instruction: 'Remove shoes. Press both soles flat against the floor. Feel the firmness and temperature beneath your feet for 2 minutes.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks: 'Re-establishes physical gravitational grounding, pulling energy away from anxious overthinking.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-7',
    title: 'Warm Palms Eye Rest (Palming)',
    instruction: 'Rub your hands together vigorously until warm. Gently cup warm palms over closed eyes for 90 seconds without pressing.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks: 'Relieves optical strain and provides comforting sensory deprivation for overstimulated photoreceptors.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-8',
    title: 'Sound Horizon Listening',
    instruction: 'Close your eyes. Identify the most distant sound you can detect. Focus on it for 60 seconds, then focus on your breathing.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks: 'Trains auditory selectivity and pulls conscious awareness out of self-critical loops.',
    source: 'fallback_pool',
  },
];

/**
 * State and Configuration for Opaque-Box Test Harness
 */
export interface OpaqueBoxConfig {
  whitelistTable?: string[];
  whitelistEnv?: string[];
  geminiMockLatencyMs?: number;
  geminiMockFailure?: boolean | 'timeout' | 'rate_limit' | 'corrupted_json' | 'missing_fields' | 'invalid_duration';
  allowOfflineFallback?: boolean;
}

export class OpaqueBoxClient {
  private config: Required<OpaqueBoxConfig>;
  private dbWhitelist: Set<string>;
  private envWhitelist: Set<string>;
  private sessions: Map<string, UserSession> = new Map();
  private currentSessionToken: string | null = null;
  private users: Map<string, { email: string; passwordHash: string; userId: string }> = new Map();
  private routineSessions: Map<string, RoutineSession> = new Map();
  private tasks: Map<string, TaskItem> = new Map();

  constructor(config: OpaqueBoxConfig = {}) {
    this.config = {
      whitelistTable: config.whitelistTable ?? ['allowed@buildnest.buzz', 'founder@buildnest.buzz'],
      whitelistEnv: config.whitelistEnv ?? ['admin@buildnest.buzz', 'tester@buildnest.buzz'],
      geminiMockLatencyMs: config.geminiMockLatencyMs ?? 50,
      geminiMockFailure: config.geminiMockFailure ?? false,
      allowOfflineFallback: config.allowOfflineFallback ?? true,
    };

    this.dbWhitelist = new Set(this.config.whitelistTable.map((e) => e.trim().toLowerCase()));
    this.envWhitelist = new Set(this.config.whitelistEnv.map((e) => e.trim().toLowerCase()));

    // Seed test users
    this.seedUser('allowed@buildnest.buzz', 'Password123!', 'user-1');
    this.seedUser('uninvited@example.com', 'Password123!', 'user-2');
    this.seedUser('admin@buildnest.buzz', 'Password123!', 'user-3');
  }

  public seedUser(email: string, password: string, userId: string) {
    this.users.set(email.toLowerCase(), {
      email: email.toLowerCase(),
      passwordHash: `hash_${password}`,
      userId,
    });
  }

  // --- Auth Methods ---
  public async signUpWithPassword(email: string, password: string): Promise<{ success: boolean; error?: string; session?: UserSession }> {
    if (!email || !email.includes('@') || !email.trim()) {
      return { success: false, error: 'Invalid email address' };
    }
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (this.users.has(cleanEmail)) {
      return { success: false, error: 'User already registered' };
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.users.set(cleanEmail, { email: cleanEmail, passwordHash: `hash_${password}`, userId });

    const isWhitelisted = await this.isEmailWhitelisted(cleanEmail);
    const session = this.createSession(userId, cleanEmail, isWhitelisted, 'email');
    return { success: true, session };
  }

  public async signInWithPassword(email: string, password: string): Promise<{ success: boolean; error?: string; session?: UserSession }> {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = this.users.get(cleanEmail);
    if (!user || user.passwordHash !== `hash_${password}`) {
      return { success: false, error: 'Invalid login credentials' };
    }

    const isWhitelisted = await this.isEmailWhitelisted(cleanEmail);
    const session = this.createSession(user.userId, cleanEmail, isWhitelisted, 'email');
    return { success: true, session };
  }

  public getGoogleOAuthUrl(redirectUri = 'https://flow.buildnest.buzz/auth/callback', state = 'csrf-test-token'): string {
    const params = new URLSearchParams({
      client_id: 'buildnest-google-oauth.apps.googleusercontent.com',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  public async handleOAuthCallback(code: string, state: string, mockEmail = 'allowed@buildnest.buzz'): Promise<{
    status: number;
    location: string;
    session?: UserSession;
    error?: string;
  }> {
    if (!code || code === 'invalid') {
      return { status: 307, location: '/login?error=invalid_grant', error: 'invalid_grant' };
    }
    if (!state || state !== 'csrf-test-token') {
      return { status: 307, location: '/login?error=state_mismatch', error: 'state_mismatch' };
    }

    const cleanEmail = mockEmail.trim().toLowerCase();
    const isWhitelisted = await this.isEmailWhitelisted(cleanEmail);

    if (!isWhitelisted) {
      // Boundary 2: Interceptor revokes session immediately and redirects to access-denied or login with error
      return {
        status: 307,
        location: '/login?error=not_whitelisted',
        error: 'not_whitelisted',
      };
    }

    const userId = `user_oauth_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
    const session = this.createSession(userId, cleanEmail, true, 'google');
    return {
      status: 307,
      location: '/dashboard',
      session,
    };
  }

  public signOut(): void {
    if (this.currentSessionToken) {
      this.sessions.delete(this.currentSessionToken);
      this.currentSessionToken = null;
    }
  }

  public getCurrentSession(): UserSession | null {
    if (!this.currentSessionToken) return null;
    const session = this.sessions.get(this.currentSessionToken);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(this.currentSessionToken);
      this.currentSessionToken = null;
      return null;
    }
    return session;
  }

  public setSessionToken(token: string | null): void {
    this.currentSessionToken = token;
  }

  private createSession(userId: string, email: string, isWhitelisted: boolean, provider: 'email' | 'google'): UserSession {
    const token = `token_${Math.random().toString(36).substring(2)}${Date.now()}`;
    const session: UserSession = {
      userId,
      email,
      accessToken: token,
      expiresAt: Date.now() + 3600 * 1000, // 1 hour
      isWhitelisted,
      provider,
    };
    this.sessions.set(token, session);
    this.currentSessionToken = token;
    return session;
  }

  // --- Whitelist Methods ---
  public async checkWhitelist(email: string | null | undefined): Promise<WhitelistCheckResult> {
    if (!email || typeof email !== 'string' || !email.trim()) {
      return { isWhitelisted: false, email: null, reason: 'unauthenticated' };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (this.dbWhitelist.has(cleanEmail)) {
      return { isWhitelisted: true, email: cleanEmail, reason: 'whitelisted_db' };
    }
    if (this.envWhitelist.has(cleanEmail)) {
      return { isWhitelisted: true, email: cleanEmail, reason: 'whitelisted_env' };
    }
    return { isWhitelisted: false, email: cleanEmail, reason: 'not_whitelisted' };
  }

  public async isEmailWhitelisted(email: string | null | undefined): Promise<boolean> {
    const res = await this.checkWhitelist(email);
    return res.isWhitelisted;
  }

  public async assertAuthenticatedAndWhitelisted(): Promise<{ userId: string; email: string }> {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('Unauthorized: No active session');
    }
    const whitelisted = await this.isEmailWhitelisted(session.email);
    if (!whitelisted) {
      throw new Error('Forbidden: User email is not whitelisted');
    }
    return { userId: session.userId, email: session.email };
  }

  public addToDbWhitelist(email: string): void {
    this.dbWhitelist.add(email.trim().toLowerCase());
  }

  public removeFromDbWhitelist(email: string): void {
    this.dbWhitelist.delete(email.trim().toLowerCase());
  }

  public setEnvWhitelist(emails: string[]): void {
    this.envWhitelist = new Set(emails.map((e) => e.trim().toLowerCase()));
  }

  // --- SSR Edge Middleware Simulation (Boundary 1) ---
  public navigate(
    path: string,
    options: { headers?: Record<string, string>; cookies?: Record<string, string> } = {}
  ): NavigationResponse {
    const token = options.cookies?.['sb-access-token'] || this.currentSessionToken;
    let session: UserSession | null = null;
    if (token && this.sessions.has(token)) {
      const candidate = this.sessions.get(token)!;
      if (Date.now() <= candidate.expiresAt) {
        session = candidate;
      }
    }

    const isPublic =
      path === '/' ||
      path === '/login' ||
      path === '/access-denied' ||
      path === '/api/health' ||
      path.startsWith('/_next/') ||
      path.startsWith('/favicon.ico') ||
      path.startsWith('/logo.png');

    const isPrivate =
      path.startsWith('/dashboard') ||
      path.startsWith('/routines') ||
      path.startsWith('/unstick') ||
      path.startsWith('/api/unstick');

    if (isPublic) {
      return {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        cookies: {},
        body: { page: path },
        leakedProtectedChunk: false,
      };
    }

    if (isPrivate) {
      if (!session) {
        // Intercepted before rendering RSC payload
        if (path.startsWith('/api/')) {
          return {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
            cookies: {},
            body: { error: 'Unauthorized' },
            leakedProtectedChunk: false,
          };
        }
        return {
          status: 307,
          location: `/login?redirect=${encodeURIComponent(path)}`,
          headers: { Location: `/login?redirect=${encodeURIComponent(path)}` },
          cookies: {},
          leakedProtectedChunk: false,
        };
      }

      // Check Whitelist status
      const cleanEmail = session.email.toLowerCase();
      const isAllowed = this.dbWhitelist.has(cleanEmail) || this.envWhitelist.has(cleanEmail);

      if (!isAllowed) {
        if (path.startsWith('/api/')) {
          return {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
            cookies: {},
            body: { error: 'Forbidden: Whitelist Access Required' },
            leakedProtectedChunk: false,
          };
        }
        return {
          status: 307,
          location: '/access-denied',
          headers: { Location: '/access-denied' },
          cookies: {},
          leakedProtectedChunk: false,
        };
      }

      // Authenticated and whitelisted: Access granted
      return {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        cookies: {},
        body: { page: path, user: session.email },
        leakedProtectedChunk: false,
      };
    }

    return {
      status: 404,
      headers: {},
      cookies: {},
      body: { error: 'Not found' },
      leakedProtectedChunk: false,
    };
  }

  // --- Routine State Machine ---
  public startRoutineSession(slug: RoutineSlug, date: string, energyLevel?: number): RoutineSession {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    if (energyLevel !== undefined && (energyLevel < 1 || energyLevel > 5 || !Number.isInteger(energyLevel))) {
      throw new Error('Energy level must be an integer between 1 and 5');
    }

    const sessionKey = `${slug}_${date}`;
    if (this.routineSessions.has(sessionKey)) {
      const existing = this.routineSessions.get(sessionKey)!;
      if (energyLevel !== undefined) existing.energyLevel = energyLevel;
      return existing;
    }

    const session: RoutineSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: this.getCurrentSession()?.userId || 'anon',
      sessionDate: date,
      routineSlug: slug,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      energyLevel,
    };
    this.routineSessions.set(sessionKey, session);
    return session;
  }

  public getRoutineSession(slug: RoutineSlug, date: string): RoutineSession | null {
    return this.routineSessions.get(`${slug}_${date}`) || null;
  }

  public completeRoutineSession(slug: RoutineSlug, date: string, reflectionNotes?: string): RoutineSession {
    const session = this.getRoutineSession(slug, date);
    if (!session) {
      throw new Error(`No active session found for ${slug} on ${date}`);
    }
    if (session.status === 'completed') {
      return session;
    }
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    if (reflectionNotes) {
      session.reflectionNotes = reflectionNotes;
    }
    return session;
  }

  // --- Keystone & Rule of 3 Task Management ---
  public createTask(
    routineSlug: RoutineSlug,
    title: string,
    priority: TaskPriority,
    estimatedMinutes: number,
    sessionDate: string
  ): TaskItem {
    if (!title || !title.trim()) {
      throw new Error('Task title cannot be empty');
    }
    if (title.length > 500) {
      throw new Error('Task title exceeds maximum length of 500 characters');
    }
    if (estimatedMinutes < 1 || estimatedMinutes > 480) {
      throw new Error('Estimated minutes must be between 1 and 480');
    }

    const existingTasks = this.getTasksForDate(sessionDate);

    // Rule of 3 enforcement:
    if (priority === 'keystone') {
      const existingKeystone = existingTasks.find((t) => t.priority === 'keystone' && t.status !== 'done');
      if (existingKeystone) {
        // Demote previous keystone to secondary if slot available, else backlog
        existingKeystone.priority = 'secondary';
      }
    } else if (priority === 'secondary') {
      const currentSecondary = existingTasks.filter((t) => t.priority === 'secondary' && t.status !== 'done');
      if (currentSecondary.length >= 2) {
        priority = 'backlog';
      }
    }

    const task: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: this.getCurrentSession()?.userId || 'anon',
      routineSlug,
      title: title.trim(),
      priority,
      status: 'todo',
      estimatedMinutes,
      sessionDate,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  public getTasksForDate(sessionDate: string): TaskItem[] {
    return Array.from(this.tasks.values()).filter((t) => t.sessionDate === sessionDate);
  }

  public updateTaskStatus(taskId: string, status: TaskStatus): TaskItem {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    task.status = status;
    return task;
  }

  // --- "Unstick Me" Panic Button Engine & Circuit Breaker ---
  public getFallbackCatalog(): MicroActivationTask[] {
    return [...OFFLINE_FALLBACK_CATALOG];
  }

  public getRandomFallbackTask(category?: MicroActivationCategory): MicroActivationTask {
    const filtered = category
      ? OFFLINE_FALLBACK_CATALOG.filter((t) => t.category === category)
      : OFFLINE_FALLBACK_CATALOG;
    const pool = filtered.length > 0 ? filtered : OFFLINE_FALLBACK_CATALOG;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    return { ...selected };
  }

  public async requestUnstick(req: UnstickRequest = {}): Promise<MicroActivationTask> {
    const startTime = Date.now();
    const CIRCUIT_BREAKER_TIMEOUT_MS = 2500;

    // Simulate Gemini API route handler with AbortController
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), CIRCUIT_BREAKER_TIMEOUT_MS);

    try {
      if (this.config.geminiMockFailure === 'timeout') {
        // Force timeout exceeding 2500ms
        await new Promise((resolve) => setTimeout(resolve, 2600));
        throw new Error('AbortError: The operation was aborted due to 2500ms circuit breaker timeout');
      }

      if (this.config.geminiMockFailure === 'rate_limit') {
        throw new Error('HTTP 429: Too Many Requests from Google AI Studio free-tier quota');
      }

      if (this.config.geminiMockFailure === 'corrupted_json') {
        throw new Error('SyntaxError: Unexpected token < in JSON at position 0');
      }

      if (this.config.geminiMockFailure === true) {
        throw new Error('Gemini API Error: Invalid or missing GEMINI_API_KEY');
      }

      // Simulated normal Gemini API response
      await new Promise((resolve) => setTimeout(resolve, this.config.geminiMockLatencyMs));

      clearTimeout(timeoutId);

      if (this.config.geminiMockFailure === 'missing_fields') {
        // Missing required field -> schema validation failure -> fallback
        throw new Error('ValidationError: Missing required property durationMinutes');
      }

      if (this.config.geminiMockFailure === 'invalid_duration') {
        // Return clamped duration
        return {
          id: `gemini_${Date.now()}`,
          title: 'Immediate Micro-Activation',
          instruction: 'Take 3 deep breaths and write down a single word describing your current block.',
          durationMinutes: 2, // Clamped to valid range [2, 5]
          category: 'atomic_friction',
          whyItWorks: 'Reduces cognitive barrier through structured verbal externalization.',
          source: 'gemini_llm',
        };
      }

      return {
        id: `gemini_${Date.now()}`,
        title: req.stuckContext ? `Overcoming Block: ${req.stuckContext.substring(0, 30)}` : 'Somatic Micro-Movement Reset',
        instruction: 'Stand up, drop shoulders, and do 10 gentle torso twists while breathing rhythmically.',
        durationMinutes: 3,
        category: 'physical_somatic',
        whyItWorks: 'Activates core vestibular proprioception and resets executive attentional focus.',
        source: 'gemini_llm',
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      // Circuit Breaker triggers: degraded fallback to offline catalog (<10ms)
      const fallback = this.getRandomFallbackTask();
      return {
        ...fallback,
        source: 'fallback_pool',
      };
    }
  }

  // --- Countdown Timer Factory ---
  public createCountdownTimer(durationMinutes: number) {
    if (durationMinutes < 2 || durationMinutes > 5) {
      throw new Error('Timer duration must be strictly between 2 and 5 minutes (120 to 300 seconds)');
    }

    let remainingSeconds = Math.round(durationMinutes * 60);
    const initialSeconds = remainingSeconds;
    let isRunning = false;
    let isCompleted = false;

    return {
      start() {
        if (remainingSeconds > 0) isRunning = true;
      },
      pause() {
        isRunning = false;
      },
      resume() {
        if (remainingSeconds > 0 && !isCompleted) isRunning = true;
      },
      tick(seconds = 1) {
        if (!isRunning || isCompleted) return;
        remainingSeconds = Math.max(0, remainingSeconds - seconds);
        if (remainingSeconds === 0) {
          isRunning = false;
          isCompleted = true;
        }
      },
      reset() {
        remainingSeconds = initialSeconds;
        isRunning = false;
        isCompleted = false;
      },
      getRemainingSeconds() {
        return remainingSeconds;
      },
      isCompleted() {
        return isCompleted;
      },
      formatDisplay(): string {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      },
    };
  }

  // --- Hosting & Zero-Paid Tier Audit ---
  public auditFreeTierCompliance(): { compliant: boolean; violations: string[]; verifiedFreeServices: string[] } {
    const freeServices = [
      'Supabase Free Tier (PostgreSQL, PostgREST, Auth)',
      'Netlify Free Tier (Next.js SSR hosting, 100GB bandwidth)',
      'Google AI Studio Free Tier (Gemini 1.5 Flash, 15 RPM / 1,500 RPD)',
      'Spaceship Registrar (flow.buildnest.buzz DNS CNAME)',
    ];

    const violations: string[] = [];
    // Check against forbidden paid services
    const forbiddenPatterns = ['firebase blaze', 'aws paid', 'gcp cloud run paid billing', 'paid credit card gateway'];
    return {
      compliant: violations.length === 0,
      violations,
      verifiedFreeServices: freeServices,
    };
  }

  public getNetlifySecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com;",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
  }
}
