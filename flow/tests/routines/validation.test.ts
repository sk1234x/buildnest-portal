import { describe, it, expect } from 'vitest';
import {
  validateSessionDate,
  validateEnergyLevel,
  validateTaskTitle,
  validateEstimatedMinutes,
  assertTaskExists,
  assertSessionExists,
} from '@/lib/routines/validation';

describe('Routines Validation Suite', () => {
  describe('validateSessionDate', () => {
    it('accepts valid ISO date YYYY-MM-DD', () => {
      expect(() => validateSessionDate('2026-11-15')).not.toThrow();
      expect(() => validateSessionDate('2025-01-01')).not.toThrow();
      expect(() => validateSessionDate('2030-12-31')).not.toThrow();
    });

    it('rejects DD-MM-YYYY format', () => {
      expect(() => validateSessionDate('15-11-2026')).toThrow(
        'Invalid date format. Expected YYYY-MM-DD'
      );
    });

    it('rejects slash separated dates', () => {
      expect(() => validateSessionDate('2026/11/15')).toThrow(
        'Invalid date format. Expected YYYY-MM-DD'
      );
    });

    it('rejects relative date strings like today or tomorrow', () => {
      expect(() => validateSessionDate('today')).toThrow(
        'Invalid date format. Expected YYYY-MM-DD'
      );
      expect(() => validateSessionDate('tomorrow')).toThrow(
        'Invalid date format. Expected YYYY-MM-DD'
      );
      expect(() => validateSessionDate('')).toThrow(
        'Invalid date format. Expected YYYY-MM-DD'
      );
    });
  });

  describe('validateEnergyLevel', () => {
    it('accepts undefined and null as optional inputs', () => {
      expect(() => validateEnergyLevel(undefined)).not.toThrow();
      expect(() => validateEnergyLevel(null)).not.toThrow();
    });

    it('accepts boundary integer values 1 and 5', () => {
      expect(() => validateEnergyLevel(1)).not.toThrow();
      expect(() => validateEnergyLevel(5)).not.toThrow();
    });

    it('accepts intermediate integer values 2, 3, 4', () => {
      expect(() => validateEnergyLevel(2)).not.toThrow();
      expect(() => validateEnergyLevel(3)).not.toThrow();
      expect(() => validateEnergyLevel(4)).not.toThrow();
    });

    it('rejects numbers below 1 (0, -1)', () => {
      expect(() => validateEnergyLevel(0)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
      expect(() => validateEnergyLevel(-1)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
    });

    it('rejects numbers above 5 (6, 10)', () => {
      expect(() => validateEnergyLevel(6)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
      expect(() => validateEnergyLevel(10)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
    });

    it('rejects float / non-integer values', () => {
      expect(() => validateEnergyLevel(3.5)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
      expect(() => validateEnergyLevel(4.2)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
    });

    it('rejects non-number types', () => {
      expect(() => validateEnergyLevel('3' as unknown as number)).toThrow(
        'Energy level must be an integer between 1 and 5'
      );
    });
  });

  describe('validateTaskTitle', () => {
    it('accepts valid non-empty trimmed titles', () => {
      expect(validateTaskTitle('Ship Prototype')).toBe('Ship Prototype');
      expect(validateTaskTitle('   Trim me   ')).toBe('Trim me');
    });

    it('accepts boundary lengths (1 character and 500 characters)', () => {
      expect(validateTaskTitle('A')).toBe('A');
      const maxTitle = 'A'.repeat(500);
      expect(validateTaskTitle(maxTitle)).toBe(maxTitle);
    });

    it('rejects empty or whitespace-only titles', () => {
      expect(() => validateTaskTitle('')).toThrow('Task title cannot be empty');
      expect(() => validateTaskTitle('   ')).toThrow('Task title cannot be empty');
      expect(() => validateTaskTitle('\t\n ')).toThrow('Task title cannot be empty');
    });

    it('rejects titles exceeding 500 characters', () => {
      const excessTitle = 'A'.repeat(501);
      expect(() => validateTaskTitle(excessTitle)).toThrow(
        'Task title exceeds maximum length of 500 characters'
      );
    });
  });

  describe('validateEstimatedMinutes', () => {
    it('accepts boundary values 1 and 480', () => {
      expect(validateEstimatedMinutes(1)).toBe(1);
      expect(validateEstimatedMinutes(480)).toBe(480);
      expect(validateEstimatedMinutes(25)).toBe(25);
    });

    it('rejects values below 1 (0, -5)', () => {
      expect(() => validateEstimatedMinutes(0)).toThrow(
        'Estimated minutes must be between 1 and 480'
      );
      expect(() => validateEstimatedMinutes(-5)).toThrow(
        'Estimated minutes must be between 1 and 480'
      );
    });

    it('rejects values above 480 (481, 1000)', () => {
      expect(() => validateEstimatedMinutes(481)).toThrow(
        'Estimated minutes must be between 1 and 480'
      );
      expect(() => validateEstimatedMinutes(1000)).toThrow(
        'Estimated minutes must be between 1 and 480'
      );
    });

    it('rejects non-integer minutes', () => {
      expect(() => validateEstimatedMinutes(25.5)).toThrow(
        'Estimated minutes must be between 1 and 480'
      );
    });
  });

  describe('assertTaskExists & assertSessionExists', () => {
    it('assertTaskExists throws exact error string when task is missing', () => {
      expect(() => assertTaskExists(null, 'task_123')).toThrow('Task with ID task_123 not found');
      expect(() => assertTaskExists(undefined, 'task_456')).toThrow('Task with ID task_456 not found');
      expect(() => assertTaskExists({ id: 'task_123' }, 'task_123')).not.toThrow();
    });

    it('assertSessionExists throws exact error string when session is missing', () => {
      expect(() => assertSessionExists(null, 'morning_launchpad', '2026-11-15')).toThrow(
        'No active session found for morning_launchpad on 2026-11-15'
      );
      expect(() =>
        assertSessionExists({ id: 'sess_1' }, 'morning_launchpad', '2026-11-15')
      ).not.toThrow();
    });
  });
});
