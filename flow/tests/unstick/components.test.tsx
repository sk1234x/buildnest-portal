import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  CircularCountdownTimer,
  clampDuration,
  formatTimeDisplay,
} from '@/components/unstick/CircularCountdownTimer';
import { UnstickModal } from '@/components/unstick/UnstickModal';
import type { MicroActivationTask } from '@/lib/unstick/types';

describe('Unstick UI Components Test Suite', () => {
  describe('CircularCountdownTimer Pure Helpers', () => {
    it('clampDuration enforces strict integer boundaries [2, 5]', () => {
      expect(clampDuration(1)).toBe(2);
      expect(clampDuration(0)).toBe(2);
      expect(clampDuration(-5)).toBe(2);
      expect(clampDuration(2)).toBe(2);
      expect(clampDuration(3.2)).toBe(3);
      expect(clampDuration(4.8)).toBe(5);
      expect(clampDuration(5)).toBe(5);
      expect(clampDuration(10)).toBe(5);
      expect(clampDuration(NaN)).toBe(2);
    });

    it('formatTimeDisplay formats seconds as MM:SS with zero-padding', () => {
      expect(formatTimeDisplay(180)).toBe('03:00');
      expect(formatTimeDisplay(125)).toBe('02:05');
      expect(formatTimeDisplay(59)).toBe('00:59');
      expect(formatTimeDisplay(0)).toBe('00:00');
      expect(formatTimeDisplay(-10)).toBe('00:00'); // Safe against negative values
    });
  });

  describe('CircularCountdownTimer Component', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders initial MM:SS display based on clamped duration', () => {
      render(<CircularCountdownTimer durationMinutes={3} />);
      expect(screen.getByTestId('timer-display')).toHaveTextContent('03:00');
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('clamps duration < 2 minutes to 02:00', () => {
      render(<CircularCountdownTimer durationMinutes={1} />);
      expect(screen.getByTestId('timer-display')).toHaveTextContent('02:00');
    });

    it('clamps duration > 5 minutes to 05:00', () => {
      render(<CircularCountdownTimer durationMinutes={10} />);
      expect(screen.getByTestId('timer-display')).toHaveTextContent('05:00');
    });

    it('starts ticking on toggle button click and updates MM:SS display', () => {
      render(<CircularCountdownTimer durationMinutes={2} />);
      expect(screen.getByTestId('timer-display')).toHaveTextContent('02:00');

      const toggleBtn = screen.getByTestId('timer-toggle-btn');
      fireEvent.click(toggleBtn);

      expect(screen.getByText('In Progress')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('timer-display')).toHaveTextContent('01:59');

      act(() => {
        vi.advanceTimersByTime(29000);
      });
      expect(screen.getByTestId('timer-display')).toHaveTextContent('01:30');
    });

    it('pauses countdown when clicked while running and does not decrement while paused', () => {
      render(<CircularCountdownTimer durationMinutes={2} />);
      const toggleBtn = screen.getByTestId('timer-toggle-btn');

      // Start timer
      fireEvent.click(toggleBtn);
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByTestId('timer-display')).toHaveTextContent('01:50');

      // Pause timer
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Paused')).toBeInTheDocument();

      // Advancing time should NOT decrement while paused
      act(() => {
        vi.advanceTimersByTime(15000);
      });
      expect(screen.getByTestId('timer-display')).toHaveTextContent('01:50');

      // Resume timer
      fireEvent.click(toggleBtn);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByTestId('timer-display')).toHaveTextContent('01:45');
    });

    it('clamps strictly at 00:00 without negative values and invokes onComplete', () => {
      const onComplete = vi.fn();
      render(<CircularCountdownTimer durationMinutes={2} onComplete={onComplete} />);

      const toggleBtn = screen.getByTestId('timer-toggle-btn');
      fireEvent.click(toggleBtn);

      // Advance 125 seconds on a 120-second timer
      act(() => {
        vi.advanceTimersByTime(125000);
      });

      expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00');
      expect(screen.getByText('Complete! 🎉')).toBeInTheDocument();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('resets back to initial duration when reset button is clicked', () => {
      render(<CircularCountdownTimer durationMinutes={2} />);
      const toggleBtn = screen.getByTestId('timer-toggle-btn');

      fireEvent.click(toggleBtn);
      act(() => {
        vi.advanceTimersByTime(20000);
      });
      expect(screen.getByTestId('timer-display')).toHaveTextContent('01:40');

      // Click reset button
      const resetBtn = screen.getByTestId('timer-reset-btn');
      fireEvent.click(resetBtn);

      expect(screen.getByTestId('timer-display')).toHaveTextContent('02:00');
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('toggles sound mute on sound button click', () => {
      render(<CircularCountdownTimer durationMinutes={2} />);
      const soundBtn = screen.getByTestId('timer-sound-btn');

      expect(soundBtn).toHaveAttribute('title', 'Mute Chime');
      fireEvent.click(soundBtn);
      expect(soundBtn).toHaveAttribute('title', 'Unmute Chime');
    });
  });

  describe('UnstickModal Component', () => {
    const mockTask: MicroActivationTask = {
      id: 'phys-1',
      title: 'The 2-Minute Body Shakeout',
      instruction:
        'Stand up immediately. Shake your hands for 30s, shake your legs for 30s, and roll your shoulders 10 times.',
      durationMinutes: 2,
      category: 'physical_somatic',
      whyItWorks:
        'Discharges stagnant adrenaline and activates the somatic motor loop to break cognitive paralysis.',
      source: 'fallback_pool',
    };

    it('does not render when isOpen is false', () => {
      const { container } = render(
        <UnstickModal isOpen={false} onClose={vi.fn()} initialTask={mockTask} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders dialog, task card, category badge, and countdown timer when isOpen is true', () => {
      render(<UnstickModal isOpen={true} onClose={vi.fn()} initialTask={mockTask} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Inertia Breaker')).toBeInTheDocument();
      expect(screen.getByTestId('unstick-task-title')).toHaveTextContent(mockTask.title);
      expect(screen.getByTestId('unstick-task-instruction')).toHaveTextContent(mockTask.instruction);
      expect(screen.getByText(/Physical \/ Somatic/)).toBeInTheDocument();
      expect(screen.getByText(mockTask.whyItWorks)).toBeInTheDocument();
      expect(screen.getByTestId('circular-countdown-timer')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<UnstickModal isOpen={true} onClose={onClose} initialTask={mockTask} />);

      const closeBtn = screen.getByTestId('unstick-modal-close-btn');
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<UnstickModal isOpen={true} onClose={onClose} initialTask={mockTask} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onTaskCompleted when I Did It button is clicked', () => {
      const onTaskCompleted = vi.fn();
      const onClose = vi.fn();
      render(
        <UnstickModal
          isOpen={true}
          onClose={onClose}
          initialTask={mockTask}
          onTaskCompleted={onTaskCompleted}
        />
      );

      const doneBtn = screen.getByTestId('unstick-complete-btn');
      fireEvent.click(doneBtn);

      expect(onTaskCompleted).toHaveBeenCalledWith(mockTask);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('cycles to a new task when Try Another is clicked', async () => {
      // Mock /api/unstick fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'env-1',
          title: 'The 3-Item Desk Clear',
          instruction: 'Identify 3 items on your desk and remove them now.',
          durationMinutes: 2,
          category: 'environmental',
          whyItWorks: 'Reduces visual noise and external cognitive load.',
          source: 'fallback_pool',
        }),
      } as any);

      render(<UnstickModal isOpen={true} onClose={vi.fn()} initialTask={mockTask} />);

      const tryAnotherBtn = screen.getByTestId('unstick-try-another-btn');
      await act(async () => {
        fireEvent.click(tryAnotherBtn);
      });

      expect(screen.getByTestId('unstick-task-title')).toHaveTextContent('The 3-Item Desk Clear');
      expect(screen.getByText(/Environmental/)).toBeInTheDocument();
    });
  });
});
