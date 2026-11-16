/**
 * Routine Service Public Facade
 * Provides high-level business logic, validation, Rule of 3 demotion, and persistence.
 */

import {
  RoutineSlug,
  RoutineStatus,
  RoutineSession,
  TaskPriority,
  TaskStatus,
  TaskItem,
  RoutineStorageEngine,
} from './types';
import {
  validateSessionDate,
  validateEnergyLevel,
  validateTaskTitle,
  validateEstimatedMinutes,
  assertTaskExists,
  assertSessionExists,
} from './validation';
import { applyRuleOfThree } from './rule-of-three';
import { defaultStorageEngine } from './storage-adapter';

export class RoutineService {
  private engine: RoutineStorageEngine;

  constructor(engine: RoutineStorageEngine = defaultStorageEngine) {
    this.engine = engine;
  }

  public setStorageEngine(engine: RoutineStorageEngine): void {
    this.engine = engine;
  }

  public getSession(slug: RoutineSlug, date: string, userId?: string): RoutineSession | null {
    validateSessionDate(date);
    const result = this.engine.getSession(slug, date, userId);
    return (result instanceof Promise ? null : result) as RoutineSession | null;
  }

  public startRoutineSession(
    slug: RoutineSlug,
    date: string,
    energyLevel?: number,
    userId: string = 'whitelisted-user'
  ): RoutineSession {
    validateSessionDate(date);
    validateEnergyLevel(energyLevel);

    const existing = this.engine.getSession(slug, date, userId);
    if (existing && !(existing instanceof Promise)) {
      if (energyLevel !== undefined) {
        existing.energyLevel = energyLevel;
        this.engine.saveSession(existing);
      }
      return existing;
    }

    const session: RoutineSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      sessionDate: date,
      routineSlug: slug,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      energyLevel,
    };

    this.engine.saveSession(session);
    return session;
  }

  public completeRoutineSession(
    slug: RoutineSlug,
    date: string,
    reflectionNotes?: string,
    userId: string = 'whitelisted-user'
  ): RoutineSession {
    validateSessionDate(date);

    const session = this.engine.getSession(slug, date, userId);
    if (!session || session instanceof Promise) {
      assertSessionExists(null, slug, date);
    }

    const currentSession = session as RoutineSession;

    if (currentSession.status === 'completed') {
      if (reflectionNotes && !currentSession.reflectionNotes) {
        currentSession.reflectionNotes = reflectionNotes;
        this.engine.saveSession(currentSession);
      }
      return currentSession;
    }

    currentSession.status = 'completed';
    currentSession.completedAt = new Date().toISOString();
    if (reflectionNotes) {
      currentSession.reflectionNotes = reflectionNotes;
    }

    this.engine.saveSession(currentSession);
    return currentSession;
  }

  public createTask(
    routineSlug: RoutineSlug,
    title: string,
    priority: TaskPriority,
    estimatedMinutes: number,
    sessionDate: string,
    userId: string = 'whitelisted-user'
  ): TaskItem {
    const cleanTitle = validateTaskTitle(title);
    const cleanMinutes = validateEstimatedMinutes(estimatedMinutes);
    validateSessionDate(sessionDate);

    // Retrieve existing tasks for this date
    const existing = (this.engine.getTasksForDate(sessionDate, userId) || []) as TaskItem[];

    // Calculate Rule of 3 demotion cascade
    const { assignedPriority, modifiedTasks } = applyRuleOfThree(
      existing,
      priority,
      sessionDate
    );

    // Persist any modified demoted tasks
    if (modifiedTasks.length > 0) {
      this.engine.updateTasks(modifiedTasks);
    }

    const newTask: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      routineSlug,
      title: cleanTitle,
      priority: assignedPriority,
      status: 'todo',
      estimatedMinutes: cleanMinutes,
      sessionDate,
    };

    this.engine.saveTask(newTask);
    return newTask;
  }

  public updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    actualMinutes?: number,
    userId: string = 'whitelisted-user'
  ): TaskItem {
    const task = this.engine.getTaskById(taskId, userId);
    assertTaskExists(task, taskId);

    const currentTask = task as TaskItem;
    currentTask.status = status;
    if (actualMinutes !== undefined) {
      currentTask.actualMinutes = actualMinutes;
    }

    this.engine.saveTask(currentTask);
    return currentTask;
  }

  public updateTaskPriority(
    taskId: string,
    priority: TaskPriority,
    userId: string = 'whitelisted-user'
  ): TaskItem {
    const task = this.engine.getTaskById(taskId, userId);
    assertTaskExists(task, taskId);

    const currentTask = task as TaskItem;
    const existing = (this.engine.getTasksForDate(currentTask.sessionDate, userId) || []) as TaskItem[];

    const { assignedPriority, modifiedTasks } = applyRuleOfThree(
      existing,
      priority,
      currentTask.sessionDate,
      taskId
    );

    if (modifiedTasks.length > 0) {
      this.engine.updateTasks(modifiedTasks);
    }

    currentTask.priority = assignedPriority;
    this.engine.saveTask(currentTask);
    return currentTask;
  }

  public getTasksForDate(
    sessionDate: string,
    userId: string = 'whitelisted-user',
    routineSlug?: RoutineSlug
  ): TaskItem[] {
    validateSessionDate(sessionDate);
    const result = this.engine.getTasksForDate(sessionDate, userId, routineSlug);
    return (result instanceof Promise ? [] : result) as TaskItem[];
  }

  public deleteTask(taskId: string, userId: string = 'whitelisted-user'): void {
    this.engine.deleteTask(taskId, userId);
  }

  public resetStore(): void {
    this.engine.resetStore();
  }
}

// Global default service facade
export const defaultRoutineService = new RoutineService(defaultStorageEngine);

export function startRoutineSession(
  slug: RoutineSlug,
  date: string,
  energyLevel?: number,
  userId?: string
): RoutineSession {
  return defaultRoutineService.startRoutineSession(slug, date, energyLevel, userId);
}

export function completeRoutineSession(
  slug: RoutineSlug,
  date: string,
  reflectionNotes?: string,
  userId?: string
): RoutineSession {
  return defaultRoutineService.completeRoutineSession(slug, date, reflectionNotes, userId);
}

export function createTask(
  routineSlug: RoutineSlug,
  title: string,
  priority: TaskPriority,
  estimatedMinutes: number,
  sessionDate: string,
  userId?: string
): TaskItem {
  return defaultRoutineService.createTask(routineSlug, title, priority, estimatedMinutes, sessionDate, userId);
}

export function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  actualMinutes?: number,
  userId?: string
): TaskItem {
  return defaultRoutineService.updateTaskStatus(taskId, status, actualMinutes, userId);
}

export function updateTaskPriority(
  taskId: string,
  priority: TaskPriority,
  userId?: string
): TaskItem {
  return defaultRoutineService.updateTaskPriority(taskId, priority, userId);
}

export function getTasksForDate(
  sessionDate: string,
  userId?: string,
  routineSlug?: RoutineSlug
): TaskItem[] {
  return defaultRoutineService.getTasksForDate(sessionDate, userId, routineSlug);
}

export function getSession(
  slug: RoutineSlug,
  date: string,
  userId?: string
): RoutineSession | null {
  return defaultRoutineService.getSession(slug, date, userId);
}

export function resetStore(): void {
  defaultRoutineService.resetStore();
}
