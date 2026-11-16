/**
 * Storage Adapter for Routine Sessions and Tasks.
 * Implements a hybrid engine: Supabase PostgreSQL with seamless fallback to
 * localStorage in browser and in-memory Map in tests / Node.js.
 */

import { RoutineSession, RoutineSlug, TaskItem, RoutineStorageEngine } from './types';

const STORAGE_KEY_SESSIONS = 'flow_routine_sessions_v1';
const STORAGE_KEY_TASKS = 'flow_routine_tasks_v1';

export class InMemoryLocalStorageEngine implements RoutineStorageEngine {
  private sessions = new Map<string, RoutineSession>();
  private tasks = new Map<string, TaskItem>();

  constructor() {
    this.hydrateFromLocalStorage();
  }

  private hydrateFromLocalStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedSessions = window.localStorage.getItem(STORAGE_KEY_SESSIONS);
        if (storedSessions) {
          const parsed: RoutineSession[] = JSON.parse(storedSessions);
          for (const s of parsed) {
            this.sessions.set(`${s.routineSlug}_${s.sessionDate}`, s);
          }
        }
        const storedTasks = window.localStorage.getItem(STORAGE_KEY_TASKS);
        if (storedTasks) {
          const parsed: TaskItem[] = JSON.parse(storedTasks);
          for (const t of parsed) {
            this.tasks.set(t.id, t);
          }
        }
      } catch {
        // Silently ignore localStorage JSON parsing or quota errors
      }
    }
  }

  private persistToLocalStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          STORAGE_KEY_SESSIONS,
          JSON.stringify(Array.from(this.sessions.values()))
        );
        window.localStorage.setItem(
          STORAGE_KEY_TASKS,
          JSON.stringify(Array.from(this.tasks.values()))
        );
      } catch {
        // Silently ignore storage quota errors
      }
    }
  }

  public getSession(slug: RoutineSlug, date: string, userId?: string): RoutineSession | null {
    const key = `${slug}_${date}`;
    const session = this.sessions.get(key) || null;
    if (session && userId && session.userId !== userId && session.userId !== 'anon') {
      return null;
    }
    return session ? { ...session } : null;
  }

  public saveSession(session: RoutineSession): RoutineSession {
    const key = `${session.routineSlug}_${session.sessionDate}`;
    const copy = { ...session };
    this.sessions.set(key, copy);
    this.persistToLocalStorage();
    return copy;
  }

  public getTasksForDate(date: string, userId?: string, routineSlug?: RoutineSlug): TaskItem[] {
    return Array.from(this.tasks.values())
      .filter((t) => {
        if (t.sessionDate !== date) return false;
        if (routineSlug && t.routineSlug !== routineSlug) return false;
        if (userId && t.userId !== userId && t.userId !== 'anon') return false;
        return true;
      })
      .map((t) => ({ ...t }));
  }

  public getTaskById(taskId: string, userId?: string): TaskItem | null {
    const task = this.tasks.get(taskId) || null;
    if (task && userId && task.userId !== userId && task.userId !== 'anon') {
      return null;
    }
    return task ? { ...task } : null;
  }

  public saveTask(task: TaskItem): TaskItem {
    const copy = { ...task };
    this.tasks.set(task.id, copy);
    this.persistToLocalStorage();
    return copy;
  }

  public updateTasks(tasks: TaskItem[]): void {
    for (const t of tasks) {
      this.tasks.set(t.id, { ...t });
    }
    this.persistToLocalStorage();
  }

  public deleteTask(taskId: string): void {
    this.tasks.delete(taskId);
    this.persistToLocalStorage();
  }

  public resetStore(): void {
    this.sessions.clear();
    this.tasks.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY_SESSIONS);
        window.localStorage.removeItem(STORAGE_KEY_TASKS);
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Supabase PostgreSQL Engine with automatic fallback to InMemoryLocalStorageEngine.
 */
export class SupabaseRoutineEngine implements RoutineStorageEngine {
  private fallbackEngine: InMemoryLocalStorageEngine;

  constructor(fallbackEngine?: InMemoryLocalStorageEngine) {
    this.fallbackEngine = fallbackEngine || new InMemoryLocalStorageEngine();
  }

  private isSupabaseConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes('mock-test.supabase.co')) {
      return false;
    }
    return true;
  }

  public async getSession(
    slug: RoutineSlug,
    date: string,
    userId?: string
  ): Promise<RoutineSession | null> {
    if (!this.isSupabaseConfigured()) {
      return this.fallbackEngine.getSession(slug, date, userId);
    }
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      let query = supabase
        .from('daily_routine_sessions')
        .select('*')
        .eq('routine_slug', slug)
        .eq('session_date', date);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.maybeSingle();
      if (error || !data) {
        return this.fallbackEngine.getSession(slug, date, userId);
      }

      return {
        id: data.id,
        userId: data.user_id,
        sessionDate: data.session_date,
        routineSlug: data.routine_slug as RoutineSlug,
        status: data.status,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        energyLevel: data.energy_level,
        keystoneFocus: data.keystone_focus,
        reflectionNotes: data.reflection_notes,
      };
    } catch {
      return this.fallbackEngine.getSession(slug, date, userId);
    }
  }

  public async saveSession(session: RoutineSession): Promise<RoutineSession> {
    // Always keep fallback in sync
    this.fallbackEngine.saveSession(session);

    if (!this.isSupabaseConfigured()) {
      return session;
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const payload = {
        id: session.id,
        user_id: session.userId,
        session_date: session.sessionDate,
        routine_slug: session.routineSlug,
        status: session.status,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        energy_level: session.energyLevel,
        keystone_focus: session.keystoneFocus,
        reflection_notes: session.reflectionNotes,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('daily_routine_sessions')
        .upsert(payload, { onConflict: 'user_id,session_date,routine_slug' });

      if (error) {
        // Fallback already saved
      }
    } catch {
      // Fallback already saved
    }

    return session;
  }

  public async getTasksForDate(
    date: string,
    userId?: string,
    routineSlug?: RoutineSlug
  ): Promise<TaskItem[]> {
    if (!this.isSupabaseConfigured()) {
      return this.fallbackEngine.getTasksForDate(date, userId, routineSlug);
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      let query = supabase.from('tasks').select('*').eq('session_date', date);

      if (userId) query = query.eq('user_id', userId);
      if (routineSlug) query = query.eq('routine_slug', routineSlug);

      const { data, error } = await query;
      if (error || !data) {
        return this.fallbackEngine.getTasksForDate(date, userId, routineSlug);
      }

      return data.map((t) => ({
        id: t.id,
        userId: t.user_id,
        routineSlug: t.routine_slug as RoutineSlug,
        title: t.title,
        priority: t.priority,
        status: t.status,
        estimatedMinutes: t.estimated_minutes,
        actualMinutes: t.actual_minutes,
        sessionDate: t.session_date,
      }));
    } catch {
      return this.fallbackEngine.getTasksForDate(date, userId, routineSlug);
    }
  }

  public async getTaskById(taskId: string, userId?: string): Promise<TaskItem | null> {
    if (!this.isSupabaseConfigured()) {
      return this.fallbackEngine.getTaskById(taskId, userId);
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      let query = supabase.from('tasks').select('*').eq('id', taskId);
      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query.maybeSingle();
      if (error || !data) {
        return this.fallbackEngine.getTaskById(taskId, userId);
      }

      return {
        id: data.id,
        userId: data.user_id,
        routineSlug: data.routine_slug as RoutineSlug,
        title: data.title,
        priority: data.priority,
        status: data.status,
        estimatedMinutes: data.estimated_minutes,
        actualMinutes: data.actual_minutes,
        sessionDate: data.session_date,
      };
    } catch {
      return this.fallbackEngine.getTaskById(taskId, userId);
    }
  }

  public async saveTask(task: TaskItem): Promise<TaskItem> {
    this.fallbackEngine.saveTask(task);

    if (!this.isSupabaseConfigured()) {
      return task;
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.from('tasks').upsert({
        id: task.id,
        user_id: task.userId,
        routine_slug: task.routineSlug,
        title: task.title,
        priority: task.priority,
        status: task.status,
        estimated_minutes: task.estimatedMinutes,
        actual_minutes: task.actualMinutes,
        session_date: task.sessionDate,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Ignored, fallback already saved
    }

    return task;
  }

  public async updateTasks(tasks: TaskItem[]): Promise<void> {
    this.fallbackEngine.updateTasks(tasks);

    if (!this.isSupabaseConfigured()) {
      return;
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const rows = tasks.map((t) => ({
        id: t.id,
        user_id: t.userId,
        routine_slug: t.routineSlug,
        title: t.title,
        priority: t.priority,
        status: t.status,
        estimated_minutes: t.estimatedMinutes,
        actual_minutes: t.actualMinutes,
        session_date: t.sessionDate,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('tasks').upsert(rows);
    } catch {
      // Ignored, fallback already saved
    }
  }

  public async deleteTask(taskId: string, userId?: string): Promise<void> {
    this.fallbackEngine.deleteTask(taskId);

    if (!this.isSupabaseConfigured()) {
      return;
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      let query = supabase.from('tasks').delete().eq('id', taskId);
      if (userId) query = query.eq('user_id', userId);
      await query;
    } catch {
      // Ignored
    }
  }

  public resetStore(): void {
    this.fallbackEngine.resetStore();
  }
}

// Global default instance
export const defaultStorageEngine = new InMemoryLocalStorageEngine();
export const supabaseStorageEngine = new SupabaseRoutineEngine(defaultStorageEngine);
