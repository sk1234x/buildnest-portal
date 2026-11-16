/**
 * Rule of 3 Engine for Keystone Focus & Secondary Tasks.
 *
 * Rules:
 * 1. Single Keystone Focus: At most 1 active (unfinished) keystone task per date.
 *    - Adding a new keystone demotes the previous keystone to 'secondary' if a slot is available (< 2 secondaries).
 *    - If secondary slots are full (>= 2 active secondaries), the previous keystone demotes to 'backlog'.
 * 2. Secondary Task Limit: At most 2 active (unfinished) secondary tasks per date.
 *    - Adding a secondary task when 2 already exist automatically demotes the new task to 'backlog'.
 * 3. Date Isolation: Tasks on one date do not affect priority limits on any other date.
 * 4. Completed tasks (status: 'done') do not count against active limits.
 */

import { TaskItem, TaskPriority } from './types';

export interface RuleOfThreeResult {
  assignedPriority: TaskPriority;
  modifiedTasks: TaskItem[];
}

/**
 * Computes the assigned priority for an incoming or updated task,
 * and produces any modifications (demotions) required on existing tasks.
 */
export function applyRuleOfThree(
  existingTasks: TaskItem[],
  requestedPriority: TaskPriority,
  sessionDate: string,
  taskIdToIgnore?: string
): RuleOfThreeResult {
  // Only consider tasks for the same date that are not 'done', excluding the current task
  const sameDateActiveTasks = existingTasks.filter(
    (t) =>
      t.sessionDate === sessionDate &&
      t.status !== 'done' &&
      (!taskIdToIgnore || t.id !== taskIdToIgnore)
  );

  const modifiedTasks: TaskItem[] = [];

  if (requestedPriority === 'keystone') {
    const existingKeystone = sameDateActiveTasks.find((t) => t.priority === 'keystone');
    if (existingKeystone) {
      const activeSecondaries = sameDateActiveTasks.filter(
        (t) => t.priority === 'secondary' && t.id !== existingKeystone.id
      );

      // If secondary slots are full (>= 2), demote existing keystone to backlog; otherwise to secondary
      const demotedPriority: TaskPriority = activeSecondaries.length < 2 ? 'secondary' : 'backlog';

      const updatedExistingKeystone: TaskItem = {
        ...existingKeystone,
        priority: demotedPriority,
      };
      modifiedTasks.push(updatedExistingKeystone);
    }

    return {
      assignedPriority: 'keystone',
      modifiedTasks,
    };
  }

  if (requestedPriority === 'secondary') {
    const activeSecondaries = sameDateActiveTasks.filter((t) => t.priority === 'secondary');
    if (activeSecondaries.length >= 2) {
      return {
        assignedPriority: 'backlog',
        modifiedTasks,
      };
    }

    return {
      assignedPriority: 'secondary',
      modifiedTasks,
    };
  }

  return {
    assignedPriority: 'backlog',
    modifiedTasks,
  };
}
