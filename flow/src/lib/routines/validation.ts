/**
 * Pure validation functions enforcing exact contracts for Flow Routines & Tasks.
 * Throws exact contract errors expected by specification and E2E test suites.
 */

export function validateSessionDate(date: string): void {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
}

export function validateEnergyLevel(energyLevel: unknown): void {
  if (energyLevel === undefined || energyLevel === null) {
    return;
  }
  if (
    typeof energyLevel !== 'number' ||
    !Number.isInteger(energyLevel) ||
    energyLevel < 1 ||
    energyLevel > 5
  ) {
    throw new Error('Energy level must be an integer between 1 and 5');
  }
}

export function validateTaskTitle(title: unknown): string {
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('Task title cannot be empty');
  }
  if (title.length > 500) {
    throw new Error('Task title exceeds maximum length of 500 characters');
  }
  return title.trim();
}

export function validateEstimatedMinutes(minutes: unknown): number {
  if (
    typeof minutes !== 'number' ||
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 480
  ) {
    throw new Error('Estimated minutes must be between 1 and 480');
  }
  return minutes;
}

export function assertTaskExists<T>(task: T | null | undefined, taskId: string): asserts task is T {
  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`);
  }
}

export function assertSessionExists<T>(
  session: T | null | undefined,
  slug: string,
  date: string
): asserts session is T {
  if (!session) {
    throw new Error(`No active session found for ${slug} on ${date}`);
  }
}
