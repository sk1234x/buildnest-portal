/**
 * Flow Routine Planning & Task Data Contracts
 * Defined in PROJECT.md § 2 and spec_miner_m3/report.md
 */

export type RoutineSlug = 'morning_launchpad' | 'day_momentum' | 'evening_shutdown';
export type RoutineStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type TaskPriority = 'keystone' | 'secondary' | 'backlog';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'deferred';

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
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes: number;
  actualMinutes?: number;
  sessionDate: string; // YYYY-MM-DD
}

export interface CreateTaskInput {
  routineSlug: RoutineSlug;
  title: string;
  priority: TaskPriority;
  estimatedMinutes: number;
  sessionDate: string;
  userId?: string;
}

export interface RoutineStorageEngine {
  getSession(slug: RoutineSlug, date: string, userId?: string): Promise<RoutineSession | null> | RoutineSession | null;
  saveSession(session: RoutineSession): Promise<RoutineSession> | RoutineSession;
  getTasksForDate(date: string, userId?: string, routineSlug?: RoutineSlug): Promise<TaskItem[]> | TaskItem[];
  getTaskById(taskId: string, userId?: string): Promise<TaskItem | null> | TaskItem | null;
  saveTask(task: TaskItem): Promise<TaskItem> | TaskItem;
  updateTasks(tasks: TaskItem[]): Promise<void> | void;
  deleteTask(taskId: string, userId?: string): Promise<void> | void;
  resetStore(): void;
}
