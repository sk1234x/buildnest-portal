import { describe, it, expect } from 'vitest';
import { applyRuleOfThree } from '@/lib/routines/rule-of-three';
import { TaskItem } from '@/lib/routines/types';

describe('Rule of 3 Demotion Engine', () => {
  const date = '2026-11-15';

  const makeTask = (id: string, priority: TaskItem['priority'], status: TaskItem['status'] = 'todo', d = date): TaskItem => ({
    id,
    userId: 'user-1',
    routineSlug: 'morning_launchpad',
    title: `Task ${id}`,
    priority,
    status,
    estimatedMinutes: 30,
    sessionDate: d,
  });

  it('allows assigning keystone when no keystone exists', () => {
    const existing: TaskItem[] = [];
    const result = applyRuleOfThree(existing, 'keystone', date);
    expect(result.assignedPriority).toBe('keystone');
    expect(result.modifiedTasks).toHaveLength(0);
  });

  it('allows assigning up to 2 secondary tasks alongside keystone', () => {
    const existing: TaskItem[] = [
      makeTask('k1', 'keystone'),
      makeTask('s1', 'secondary'),
    ];
    const result = applyRuleOfThree(existing, 'secondary', date);
    expect(result.assignedPriority).toBe('secondary');
    expect(result.modifiedTasks).toHaveLength(0);
  });

  it('automatically demotes a 3rd secondary task to backlog', () => {
    const existing: TaskItem[] = [
      makeTask('k1', 'keystone'),
      makeTask('s1', 'secondary'),
      makeTask('s2', 'secondary'),
    ];
    const result = applyRuleOfThree(existing, 'secondary', date);
    expect(result.assignedPriority).toBe('backlog');
    expect(result.modifiedTasks).toHaveLength(0);
  });

  it('demotes existing keystone to secondary when a new keystone is added and secondary slots are free', () => {
    const existing: TaskItem[] = [
      makeTask('k1', 'keystone'),
      makeTask('s1', 'secondary'),
    ];
    const result = applyRuleOfThree(existing, 'keystone', date);
    expect(result.assignedPriority).toBe('keystone');
    expect(result.modifiedTasks).toHaveLength(1);
    expect(result.modifiedTasks[0].id).toBe('k1');
    expect(result.modifiedTasks[0].priority).toBe('secondary');
  });

  it('demotes existing keystone to backlog when secondary slots are full (2 secondaries)', () => {
    const existing: TaskItem[] = [
      makeTask('k1', 'keystone'),
      makeTask('s1', 'secondary'),
      makeTask('s2', 'secondary'),
    ];
    const result = applyRuleOfThree(existing, 'keystone', date);
    expect(result.assignedPriority).toBe('keystone');
    expect(result.modifiedTasks).toHaveLength(1);
    expect(result.modifiedTasks[0].id).toBe('k1');
    expect(result.modifiedTasks[0].priority).toBe('backlog');
  });

  it('does not count completed (done) tasks against priority limits', () => {
    const existing: TaskItem[] = [
      makeTask('k1', 'keystone', 'done'),
      makeTask('s1', 'secondary', 'done'),
      makeTask('s2', 'secondary', 'done'),
    ];
    // Since existing tasks are 'done', a new keystone is assigned without modifying k1
    const resKeystone = applyRuleOfThree(existing, 'keystone', date);
    expect(resKeystone.assignedPriority).toBe('keystone');
    expect(resKeystone.modifiedTasks).toHaveLength(0);

    // And a new secondary is allowed as secondary because previous ones are 'done'
    const resSecondary = applyRuleOfThree(existing, 'secondary', date);
    expect(resSecondary.assignedPriority).toBe('secondary');
  });

  it('strictly isolates priority limits by date', () => {
    const yesterday = '2026-11-14';
    const existing: TaskItem[] = [
      makeTask('k1', 'keystone', 'todo', yesterday),
      makeTask('s1', 'secondary', 'todo', yesterday),
      makeTask('s2', 'secondary', 'todo', yesterday),
    ];
    // On today (2026-11-15), full capacity is available despite yesterday's unfinished tasks
    const resKeystone = applyRuleOfThree(existing, 'keystone', date);
    expect(resKeystone.assignedPriority).toBe('keystone');
    expect(resKeystone.modifiedTasks).toHaveLength(0);

    const resSecondary = applyRuleOfThree(existing, 'secondary', date);
    expect(resSecondary.assignedPriority).toBe('secondary');
  });

  it('ignores self when updating existing task', () => {
    const existing: TaskItem[] = [
      makeTask('s1', 'secondary'),
      makeTask('s2', 'secondary'),
    ];
    // Updating s1 to secondary should not demote itself to backlog
    const result = applyRuleOfThree(existing, 'secondary', date, 's1');
    expect(result.assignedPriority).toBe('secondary');
  });
});
