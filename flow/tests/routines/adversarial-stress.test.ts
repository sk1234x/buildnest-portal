import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateSessionDate,
  validateEnergyLevel,
  validateTaskTitle,
  validateEstimatedMinutes,
  assertTaskExists,
  assertSessionExists,
} from '@/lib/routines/validation';
import { applyRuleOfThree } from '@/lib/routines/rule-of-three';
import {
  startRoutineSession,
  completeRoutineSession,
  createTask,
  updateTaskStatus,
  updateTaskPriority,
  getTasksForDate,
  getSession,
  resetStore,
} from '@/lib/routines/service';
import { TaskItem, RoutineSlug } from '@/lib/routines/types';

describe('Adversarial Stress Testing: Core Routines Domain Layer', () => {
  const TEST_DATE = '2026-11-15';
  const OTHER_DATE = '2026-11-16';

  beforeEach(() => {
    resetStore();
  });

  // =========================================================================
  // 1. BOUNDARY CONDITIONS
  // =========================================================================
  describe('1. Boundary Conditions', () => {
    describe('1.1 Malformed Dates', () => {
      it('rejects slashes in date string', () => {
        expect(() => validateSessionDate('2026/11/15')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('2026/1/5')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
      });

      it('rejects non-ISO date orders (DD-MM-YYYY, MM-DD-YYYY, compact)', () => {
        expect(() => validateSessionDate('15-11-2026')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('11-15-2026')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('20261115')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('2026.11.15')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('2026-1-5')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('2026-01-5')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
      });

      it('rejects relative English date words and conversational strings', () => {
        const relativeWords = ['today', 'yesterday', 'tomorrow', 'now', 'next monday', 'last week'];
        for (const word of relativeWords) {
          expect(() => validateSessionDate(word)).toThrow(
            'Invalid date format. Expected YYYY-MM-DD'
          );
        }
      });

      it('rejects empty strings, whitespace, and non-string values', () => {
        expect(() => validateSessionDate('')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('   ')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('\t\n')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate(null as unknown as string)).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate(undefined as unknown as string)).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
      });

      it('rejects truncated or overflowing ISO-like strings', () => {
        expect(() => validateSessionDate('2026-11')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('2026-11-150')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
        expect(() => validateSessionDate('2026-11-1')).toThrow(
          'Invalid date format. Expected YYYY-MM-DD'
        );
      });

      it('evaluates leap year dates matching YYYY-MM-DD format', () => {
        // Leap year 2024-02-29 is structurally valid YYYY-MM-DD format
        expect(() => validateSessionDate('2024-02-29')).not.toThrow();
        // Regex format strictly matches 4-digit year, 2-digit month, 2-digit day
        expect(() => validateSessionDate('2028-02-29')).not.toThrow();
      });
    });

    describe('1.2 Energy Ratings', () => {
      it('accepts valid boundary and intermediate integer energy levels (1 to 5)', () => {
        [1, 2, 3, 4, 5].forEach((val) => {
          expect(() => validateEnergyLevel(val)).not.toThrow();
        });
      });

      it('accepts null and undefined as optional energy levels', () => {
        expect(() => validateEnergyLevel(undefined)).not.toThrow();
        expect(() => validateEnergyLevel(null)).not.toThrow();
      });

      it('rejects floating point ratings (e.g. 3.5, 1.1, 4.99)', () => {
        const floats = [3.5, 1.1, 4.99, 0.5, 5.0001, -2.5];
        for (const flt of floats) {
          expect(() => validateEnergyLevel(flt)).toThrow(
            'Energy level must be an integer between 1 and 5'
          );
        }
      });

      it('rejects negative numbers and zero', () => {
        const invalid = [0, -1, -5, -100];
        for (const val of invalid) {
          expect(() => validateEnergyLevel(val)).toThrow(
            'Energy level must be an integer between 1 and 5'
          );
        }
      });

      it('rejects overflow above 5 (6, 100, Infinity)', () => {
        const overflows = [6, 7, 10, 100, Infinity, Number.MAX_SAFE_INTEGER];
        for (const val of overflows) {
          expect(() => validateEnergyLevel(val)).toThrow(
            'Energy level must be an integer between 1 and 5'
          );
        }
      });

      it('rejects non-numeric types and NaN', () => {
        const nonNumerics = ['3', '5', true, false, {}, [], NaN, () => 3];
        for (const val of nonNumerics) {
          expect(() => validateEnergyLevel(val)).toThrow(
            'Energy level must be an integer between 1 and 5'
          );
        }
      });
    });

    describe('1.3 Task Titles', () => {
      it('rejects empty strings and whitespace-only strings', () => {
        const emptyValues = ['', ' ', '   ', '\t', '\n', '\r\n  \t '];
        for (const val of emptyValues) {
          expect(() => validateTaskTitle(val)).toThrow('Task title cannot be empty');
        }
      });

      it('rejects non-string values', () => {
        const nonStrings = [null, undefined, 12345, true, {}, []];
        for (const val of nonStrings) {
          expect(() => validateTaskTitle(val)).toThrow('Task title cannot be empty');
        }
      });

      it('accepts boundary string lengths: exactly 1 character', () => {
        expect(validateTaskTitle('X')).toBe('X');
        expect(validateTaskTitle(' 1 ')).toBe('1');
      });

      it('accepts boundary string lengths: exactly 500 characters', () => {
        const exact500 = 'K'.repeat(500);
        expect(validateTaskTitle(exact500)).toBe(exact500);
      });

      it('rejects boundary string lengths: 501 characters and above', () => {
        const length501 = 'K'.repeat(501);
        expect(() => validateTaskTitle(length501)).toThrow(
          'Task title exceeds maximum length of 500 characters'
        );

        const length1000 = 'K'.repeat(1000);
        expect(() => validateTaskTitle(length1000)).toThrow(
          'Task title exceeds maximum length of 500 characters'
        );
      });

      it('handles unicode, multi-byte emojis, and RTL/foreign characters safely', () => {
        const unicodeTitles = [
          '🚀 Deep Focus Sprint ⚡ 🧠',
          'مهمة التركيز الأساسية',
          '今日の最優先タスク',
          'Café au lait & Crème Brûlée',
          '🔥 Special @#$% & Symbols <>/\\',
        ];

        for (const title of unicodeTitles) {
          const validated = validateTaskTitle(title);
          expect(validated).toBe(title.trim());
        }
      });

      it('retains XSS attempt strings safely without executing or breaking validation', () => {
        const xssAttempts = [
          "<script>alert('xss')</script>",
          '<img src=x onerror=alert(1)>',
          'javascript:void(0)',
          '"><svg onload=alert(document.cookie)>',
        ];

        for (const attempt of xssAttempts) {
          const validated = validateTaskTitle(attempt);
          expect(validated).toBe(attempt);
        }
      });
    });

    describe('1.4 Estimated Minutes', () => {
      it('accepts valid minimum boundary of 1 minute', () => {
        expect(validateEstimatedMinutes(1)).toBe(1);
      });

      it('accepts valid maximum boundary of 480 minutes (8 hours)', () => {
        expect(validateEstimatedMinutes(480)).toBe(480);
      });

      it('accepts typical focus durations (5, 15, 25, 45, 60, 90, 120)', () => {
        [5, 15, 25, 45, 60, 90, 120].forEach((m) => {
          expect(validateEstimatedMinutes(m)).toBe(m);
        });
      });

      it('rejects 0 minutes', () => {
        expect(() => validateEstimatedMinutes(0)).toThrow(
          'Estimated minutes must be between 1 and 480'
        );
      });

      it('rejects negative minutes (-1, -30, -480)', () => {
        const negatives = [-1, -15, -60, -480];
        for (const neg of negatives) {
          expect(() => validateEstimatedMinutes(neg)).toThrow(
            'Estimated minutes must be between 1 and 480'
          );
        }
      });

      it('rejects 481 minutes and extreme overflow (>480)', () => {
        const overflows = [481, 500, 1440, Infinity];
        for (const ov of overflows) {
          expect(() => validateEstimatedMinutes(ov)).toThrow(
            'Estimated minutes must be between 1 and 480'
          );
        }
      });

      it('rejects fractional / floating point minutes', () => {
        const floats = [0.5, 1.5, 25.5, 479.9];
        for (const flt of floats) {
          expect(() => validateEstimatedMinutes(flt)).toThrow(
            'Estimated minutes must be between 1 and 480'
          );
        }
      });

      it('rejects non-numeric types and NaN', () => {
        const nonNumerics = ['25', null, undefined, true, NaN, {}, []];
        for (const nn of nonNumerics) {
          expect(() => validateEstimatedMinutes(nn)).toThrow(
            'Estimated minutes must be between 1 and 480'
          );
        }
      });
    });
  });

  // =========================================================================
  // 2. RULE OF 3 DEMOTION CASCADE STRESS
  // =========================================================================
  describe('2. Rule of 3 Demotion Cascade Stress', () => {
    it('executes a 5-step successive Keystone addition cascade correctly', () => {
      // Step 1: Add K1 as Keystone
      const k1 = createTask('morning_launchpad', 'Keystone 1', 'keystone', 30, TEST_DATE);
      expect(k1.priority).toBe('keystone');

      let tasks = getTasksForDate(TEST_DATE);
      expect(tasks).toHaveLength(1);
      expect(tasks.find((t) => t.id === k1.id)?.priority).toBe('keystone');

      // Step 2: Add K2 as Keystone -> K1 demotes to 'secondary' (1 secondary slot used)
      const k2 = createTask('morning_launchpad', 'Keystone 2', 'keystone', 45, TEST_DATE);
      expect(k2.priority).toBe('keystone');

      tasks = getTasksForDate(TEST_DATE);
      expect(tasks).toHaveLength(2);
      expect(tasks.find((t) => t.id === k2.id)?.priority).toBe('keystone');
      expect(tasks.find((t) => t.id === k1.id)?.priority).toBe('secondary');

      // Step 3: Add K3 as Keystone -> K2 demotes to 'secondary' (2 secondary slots now used: K1, K2)
      const k3 = createTask('morning_launchpad', 'Keystone 3', 'keystone', 60, TEST_DATE);
      expect(k3.priority).toBe('keystone');

      tasks = getTasksForDate(TEST_DATE);
      expect(tasks).toHaveLength(3);
      expect(tasks.find((t) => t.id === k3.id)?.priority).toBe('keystone');
      expect(tasks.find((t) => t.id === k2.id)?.priority).toBe('secondary');
      expect(tasks.find((t) => t.id === k1.id)?.priority).toBe('secondary');

      // Step 4: Add K4 as Keystone -> Secondaries are full (K1, K2), so K3 demotes to 'backlog'
      const k4 = createTask('morning_launchpad', 'Keystone 4', 'keystone', 25, TEST_DATE);
      expect(k4.priority).toBe('keystone');

      tasks = getTasksForDate(TEST_DATE);
      expect(tasks).toHaveLength(4);
      expect(tasks.find((t) => t.id === k4.id)?.priority).toBe('keystone');
      expect(tasks.find((t) => t.id === k3.id)?.priority).toBe('backlog');
      expect(tasks.find((t) => t.id === k2.id)?.priority).toBe('secondary');
      expect(tasks.find((t) => t.id === k1.id)?.priority).toBe('secondary');

      // Step 5: Add K5 as Keystone -> Secondaries still full (K1, K2), so K4 demotes to 'backlog'
      const k5 = createTask('morning_launchpad', 'Keystone 5', 'keystone', 15, TEST_DATE);
      expect(k5.priority).toBe('keystone');

      tasks = getTasksForDate(TEST_DATE);
      expect(tasks).toHaveLength(5);
      expect(tasks.find((t) => t.id === k5.id)?.priority).toBe('keystone');
      expect(tasks.find((t) => t.id === k4.id)?.priority).toBe('backlog');
      expect(tasks.find((t) => t.id === k3.id)?.priority).toBe('backlog');
      expect(tasks.find((t) => t.id === k2.id)?.priority).toBe('secondary');
      expect(tasks.find((t) => t.id === k1.id)?.priority).toBe('secondary');
    });

    it('demotes a 3rd requested secondary task to backlog when 2 secondaries exist', () => {
      const s1 = createTask('day_momentum', 'Secondary 1', 'secondary', 20, TEST_DATE);
      const s2 = createTask('day_momentum', 'Secondary 2', 'secondary', 25, TEST_DATE);
      expect(s1.priority).toBe('secondary');
      expect(s2.priority).toBe('secondary');

      // 3rd secondary addition
      const s3 = createTask('day_momentum', 'Secondary 3', 'secondary', 30, TEST_DATE);
      expect(s3.priority).toBe('backlog');

      // 4th secondary addition
      const s4 = createTask('day_momentum', 'Secondary 4', 'secondary', 35, TEST_DATE);
      expect(s4.priority).toBe('backlog');

      const tasks = getTasksForDate(TEST_DATE);
      const secondaries = tasks.filter((t) => t.priority === 'secondary');
      const backlogs = tasks.filter((t) => t.priority === 'backlog');
      expect(secondaries).toHaveLength(2);
      expect(backlogs).toHaveLength(2);
    });

    it('verifies completed tasks (status: done) do not consume active keystone or secondary capacity', () => {
      // Create a keystone and mark it 'done'
      const k1 = createTask('morning_launchpad', 'Initial Keystone', 'keystone', 40, TEST_DATE);
      updateTaskStatus(k1.id, 'done');

      // Adding a new keystone should NOT modify k1 and should be assigned 'keystone' directly
      const k2 = createTask('morning_launchpad', 'New Keystone', 'keystone', 50, TEST_DATE);
      expect(k2.priority).toBe('keystone');

      let tasks = getTasksForDate(TEST_DATE);
      const foundK1 = tasks.find((t) => t.id === k1.id);
      expect(foundK1?.priority).toBe('keystone');
      expect(foundK1?.status).toBe('done');

      // Create two secondaries and mark both 'done'
      const s1 = createTask('day_momentum', 'Secondary Done 1', 'secondary', 20, TEST_DATE);
      const s2 = createTask('day_momentum', 'Secondary Done 2', 'secondary', 25, TEST_DATE);
      updateTaskStatus(s1.id, 'done');
      updateTaskStatus(s2.id, 'done');

      // Now add 2 more secondaries: since s1 and s2 are done, new ones get 'secondary' slots!
      const s3 = createTask('day_momentum', 'New Secondary 1', 'secondary', 30, TEST_DATE);
      const s4 = createTask('day_momentum', 'New Secondary 2', 'secondary', 35, TEST_DATE);
      expect(s3.priority).toBe('secondary');
      expect(s4.priority).toBe('secondary');

      // A 5th secondary (with 2 active secondaries s3 and s4) demotes to 'backlog'
      const s5 = createTask('day_momentum', 'Overflow Secondary', 'secondary', 15, TEST_DATE);
      expect(s5.priority).toBe('backlog');
    });

    it('strictly isolates Rule of 3 capacity across multiple dates', () => {
      // Fill capacity on Day A (2026-11-15): 1 Keystone + 2 Secondaries
      const kA = createTask('morning_launchpad', 'Day A Keystone', 'keystone', 60, TEST_DATE);
      const s1A = createTask('morning_launchpad', 'Day A Sec 1', 'secondary', 30, TEST_DATE);
      const s2A = createTask('morning_launchpad', 'Day A Sec 2', 'secondary', 30, TEST_DATE);

      // Verify Day A has 3 active tasks
      const tasksA = getTasksForDate(TEST_DATE);
      expect(tasksA).toHaveLength(3);

      // On Day B (2026-11-16), full Rule of 3 capacity MUST be available
      const kB = createTask('morning_launchpad', 'Day B Keystone', 'keystone', 45, OTHER_DATE);
      const s1B = createTask('morning_launchpad', 'Day B Sec 1', 'secondary', 25, OTHER_DATE);
      const s2B = createTask('morning_launchpad', 'Day B Sec 2', 'secondary', 20, OTHER_DATE);

      expect(kB.priority).toBe('keystone');
      expect(s1B.priority).toBe('secondary');
      expect(s2B.priority).toBe('secondary');

      // Adding tasks on Day B must NOT have touched Day A tasks
      const freshTasksA = getTasksForDate(TEST_DATE);
      expect(freshTasksA.find((t) => t.id === kA.id)?.priority).toBe('keystone');
      expect(freshTasksA.find((t) => t.id === s1A.id)?.priority).toBe('secondary');
      expect(freshTasksA.find((t) => t.id === s2A.id)?.priority).toBe('secondary');

      // Adding a 3rd secondary on Day B goes to backlog on Day B only
      const s3B = createTask('morning_launchpad', 'Day B Sec 3', 'secondary', 15, OTHER_DATE);
      expect(s3B.priority).toBe('backlog');

      // Verify task counts per date
      expect(getTasksForDate(TEST_DATE)).toHaveLength(3);
      expect(getTasksForDate(OTHER_DATE)).toHaveLength(4);
    });

    it('handles task priority promotion and demotion via updateTaskPriority', () => {
      const b1 = createTask('morning_launchpad', 'Backlog Item', 'backlog', 30, TEST_DATE);
      expect(b1.priority).toBe('backlog');

      // Promote backlog item to secondary
      const updatedS = updateTaskPriority(b1.id, 'secondary');
      expect(updatedS.priority).toBe('secondary');

      // Promote to keystone
      const updatedK = updateTaskPriority(b1.id, 'keystone');
      expect(updatedK.priority).toBe('keystone');

      // Updating priority of existing task does not count itself against capacity limits
      const updatedAgain = updateTaskPriority(b1.id, 'keystone');
      expect(updatedAgain.priority).toBe('keystone');
    });
  });

  // =========================================================================
  // 3. SESSION IDEMPOTENCY & STATE MACHINE
  // =========================================================================
  describe('3. Session Idempotency & State Machine', () => {
    it('returns existing session idempotently on repeated startRoutineSession calls and updates energy', () => {
      // First start
      const s1 = startRoutineSession('morning_launchpad', TEST_DATE, 2);
      expect(s1.routineSlug).toBe('morning_launchpad');
      expect(s1.sessionDate).toBe(TEST_DATE);
      expect(s1.status).toBe('in_progress');
      expect(s1.energyLevel).toBe(2);
      const originalId = s1.id;
      const originalStartedAt = s1.startedAt;

      // Second start on same date: updates energy level to 5, preserves ID and startedAt
      const s2 = startRoutineSession('morning_launchpad', TEST_DATE, 5);
      expect(s2.id).toBe(originalId);
      expect(s2.startedAt).toBe(originalStartedAt);
      expect(s2.energyLevel).toBe(5);

      // Third start without specifying energy level: retains existing energy level
      const s3 = startRoutineSession('morning_launchpad', TEST_DATE);
      expect(s3.id).toBe(originalId);
      expect(s3.energyLevel).toBe(5);

      // Verify store contains only one session for this slug + date
      const stored = getSession('morning_launchpad', TEST_DATE);
      expect(stored?.id).toBe(originalId);
      expect(stored?.energyLevel).toBe(5);
    });

    it('verifies completeRoutineSession idempotency across repeated calls', () => {
      startRoutineSession('evening_shutdown', TEST_DATE);

      // First completion
      const completed1 = completeRoutineSession(
        'evening_shutdown',
        TEST_DATE,
        'Loop closed successfully.'
      );
      expect(completed1.status).toBe('completed');
      expect(completed1.completedAt).toBeDefined();
      expect(completed1.reflectionNotes).toBe('Loop closed successfully.');
      const completedAtTimestamp = completed1.completedAt;

      // Second completion: must be idempotent, preserving ID, status, and original completedAt
      const completed2 = completeRoutineSession(
        'evening_shutdown',
        TEST_DATE,
        'Ignored replacement notes'
      );
      expect(completed2.id).toBe(completed1.id);
      expect(completed2.status).toBe('completed');
      expect(completed2.completedAt).toBe(completedAtTimestamp);
      expect(completed2.reflectionNotes).toBe('Loop closed successfully.');
    });

    it('throws exact error message when completeRoutineSession is attempted on unstarted routine', () => {
      const slugs: RoutineSlug[] = ['morning_launchpad', 'day_momentum', 'evening_shutdown'];
      for (const slug of slugs) {
        expect(() => completeRoutineSession(slug, '2026-12-25')).toThrow(
          `No active session found for ${slug} on 2026-12-25`
        );
      }
    });

    it('isolates sessions by routine slug on the same date', () => {
      const morning = startRoutineSession('morning_launchpad', TEST_DATE, 4);
      const momentum = startRoutineSession('day_momentum', TEST_DATE, 3);
      const evening = startRoutineSession('evening_shutdown', TEST_DATE, 2);

      expect(morning.id).not.toBe(momentum.id);
      expect(momentum.id).not.toBe(evening.id);

      expect(getSession('morning_launchpad', TEST_DATE)?.energyLevel).toBe(4);
      expect(getSession('day_momentum', TEST_DATE)?.energyLevel).toBe(3);
      expect(getSession('evening_shutdown', TEST_DATE)?.energyLevel).toBe(2);
    });

    it('manages task status lifecycle (todo -> in_progress -> done / deferred)', () => {
      const task = createTask('day_momentum', 'Focus Sprint Task', 'keystone', 25, TEST_DATE);
      expect(task.status).toBe('todo');

      const active = updateTaskStatus(task.id, 'in_progress');
      expect(active.status).toBe('in_progress');

      const finished = updateTaskStatus(task.id, 'done', 22);
      expect(finished.status).toBe('done');
      expect(finished.actualMinutes).toBe(22);

      // Verify updating non-existent task throws exact error
      expect(() => updateTaskStatus('non-existent-task-id', 'done')).toThrow(
        'Task with ID non-existent-task-id not found'
      );
    });
  });
});
