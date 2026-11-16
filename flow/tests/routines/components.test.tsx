import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RoutineCard } from '@/components/routines/RoutineCard';
import { EnergyRating } from '@/components/routines/EnergyRating';
import { KeystoneSelector } from '@/components/routines/KeystoneSelector';
import { FocusSprintTimer } from '@/components/routines/FocusSprintTimer';
import { ReflectionForm } from '@/components/routines/ReflectionForm';
import { TaskRow } from '@/components/routines/TaskRow';
import { TaskItem } from '@/lib/routines/types';

describe('Routines UI Components Test Suite', () => {
  describe('RoutineCard Component', () => {
    it('renders title, circadian icon, status badge, and navigation CTA link', () => {
      render(
        <RoutineCard
          slug="morning_launchpad"
          title="Morning Launchpad"
          description="Energy check-in and keystone selection."
          anchorNumber={1}
          emoji="🌅"
          href="/routines/morning"
          ctaText="Start Morning Routine"
          status="in_progress"
          energyLevel={4}
        />
      );

      expect(screen.getByText('Morning Launchpad')).toBeInTheDocument();
      expect(screen.getByText('🌅')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText(/Start Morning Routine/)).toBeInTheDocument();
      expect(screen.getByText(/Energy: 4\/5/)).toBeInTheDocument();
    });
  });

  describe('EnergyRating Component', () => {
    it('renders 5 rating cards with labels', () => {
      render(<EnergyRating value={3} onChange={vi.fn()} />);
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      expect(screen.getByText(/1\. Drained/)).toBeInTheDocument();
      expect(screen.getByText(/3\. Steady/)).toBeInTheDocument();
      expect(screen.getByText(/5\. Peak/)).toBeInTheDocument();
    });

    it('triggers onChange with selected integer level', () => {
      const onChange = vi.fn();
      render(<EnergyRating value={2} onChange={onChange} />);

      const level4Button = screen.getByRole('radio', { name: /Energy level 4/i });
      fireEvent.click(level4Button);

      expect(onChange).toHaveBeenCalledWith(4);
    });

    it('supports keyboard navigation via arrow keys', () => {
      const onChange = vi.fn();
      render(<EnergyRating value={3} onChange={onChange} />);

      const level3Button = screen.getByRole('radio', { name: /Energy level 3/i });
      fireEvent.keyDown(level3Button, { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith(4);

      fireEvent.keyDown(level3Button, { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith(2);
    });
  });

  describe('TaskRow Component', () => {
    const task: TaskItem = {
      id: 'task-1',
      userId: 'user-1',
      routineSlug: 'morning_launchpad',
      title: 'Draft System Plan',
      priority: 'keystone',
      status: 'todo',
      estimatedMinutes: 30,
      sessionDate: '2026-11-15',
    };

    it('renders task title, priority badge, and duration', () => {
      render(<TaskRow task={task} />);
      expect(screen.getByText('Draft System Plan')).toBeInTheDocument();
      expect(screen.getByText('Keystone')).toBeInTheDocument();
      expect(screen.getByText('⏱️ 30m')).toBeInTheDocument();
    });

    it('toggles completion status on checkbox click', () => {
      const onStatusChange = vi.fn();
      render(<TaskRow task={task} onStatusChange={onStatusChange} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(onStatusChange).toHaveBeenCalledWith('task-1', 'done');
    });
  });

  describe('KeystoneSelector Component', () => {
    const sessionDate = '2026-11-15';
    const mockTasks: TaskItem[] = [
      {
        id: 'k1',
        userId: 'user-1',
        routineSlug: 'morning_launchpad',
        title: 'Primary Keystone Focus',
        priority: 'keystone',
        status: 'todo',
        estimatedMinutes: 45,
        sessionDate,
      },
    ];

    it('displays dedicated Keystone slot with active task', () => {
      render(
        <KeystoneSelector
          sessionDate={sessionDate}
          tasks={mockTasks}
          onTaskCreated={vi.fn()}
        />
      );

      expect(screen.getByText('Primary Keystone Focus')).toBeInTheDocument();
      expect(screen.getByText('1/1 Keystone')).toBeInTheDocument();
    });

    it('validates task title and shows error on empty submission', () => {
      const onTaskCreated = vi.fn();
      render(
        <KeystoneSelector
          sessionDate={sessionDate}
          tasks={mockTasks}
          onTaskCreated={onTaskCreated}
        />
      );

      const addButton = screen.getByRole('button', { name: /Add Task/i });
      fireEvent.click(addButton);

      expect(screen.getByText('Task title cannot be empty')).toBeInTheDocument();
      expect(onTaskCreated).not.toHaveBeenCalled();
    });

    it('shows demotion notice when adding new keystone over existing', () => {
      const onTaskCreated = vi.fn();
      render(
        <KeystoneSelector
          sessionDate={sessionDate}
          tasks={mockTasks}
          onTaskCreated={onTaskCreated}
        />
      );

      const input = screen.getByPlaceholderText(/Draft Product Architecture/i);
      fireEvent.change(input, { target: { value: 'New Urgent Keystone' } });

      const addButton = screen.getByRole('button', { name: /Add Task/i });
      fireEvent.click(addButton);

      expect(onTaskCreated).toHaveBeenCalledWith(
        'New Urgent Keystone',
        'keystone',
        25,
        'morning_launchpad'
      );
      expect(screen.getByTestId('demotion-banner')).toBeInTheDocument();
      expect(screen.getByText(/Previous Keystone/)).toBeInTheDocument();
    });
  });

  describe('FocusSprintTimer Component', () => {
    it('formats initial duration as 25:00 and provides controls', () => {
      render(<FocusSprintTimer defaultDurationMinutes={25} />);
      expect(screen.getByTestId('timer-display')).toHaveTextContent('25:00');
      expect(screen.getByRole('button', { name: /Start Sprint/i })).toBeInTheDocument();
    });

    it('toggles timer running state and ticks down', () => {
      vi.useFakeTimers();

      render(<FocusSprintTimer defaultDurationMinutes={25} />);
      const startButton = screen.getByRole('button', { name: /Start Sprint/i });

      act(() => {
        fireEvent.click(startButton);
      });

      expect(screen.getByRole('button', { name: /Pause Sprint/i })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByTestId('timer-display')).toHaveTextContent('24:57');

      vi.useRealTimers();
    });
  });

  describe('ReflectionForm Component', () => {
    const completedTasks: TaskItem[] = [
      {
        id: 't-done',
        userId: 'user-1',
        routineSlug: 'morning_launchpad',
        title: 'Built Core Engine',
        priority: 'keystone',
        status: 'done',
        estimatedMinutes: 60,
        actualMinutes: 55,
        sessionDate: '2026-11-15',
      },
    ];

    const incompleteTasks: TaskItem[] = [
      {
        id: 't-todo',
        userId: 'user-1',
        routineSlug: 'day_momentum',
        title: 'Refactor UI styles',
        priority: 'secondary',
        status: 'todo',
        estimatedMinutes: 30,
        sessionDate: '2026-11-15',
      },
    ];

    it('renders micro-wins and allows submitting reflection shutdown', () => {
      const onCompleteShutdown = vi.fn();
      render(
        <ReflectionForm
          sessionDate="2026-11-15"
          completedTasks={completedTasks}
          incompleteTasks={incompleteTasks}
          onCompleteShutdown={onCompleteShutdown}
        />
      );

      expect(screen.getByText('Built Core Engine')).toBeInTheDocument();
      expect(screen.getByText('Refactor UI styles')).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText(/What worked today/i);
      fireEvent.change(textarea, { target: { value: 'Solid productivity day.' } });

      const submitButton = screen.getByRole('button', { name: /Close the Loop/i });
      fireEvent.click(submitButton);

      expect(onCompleteShutdown).toHaveBeenCalledWith('Solid productivity day.', []);
      expect(screen.getByText(/Shutdown Complete/i)).toBeInTheDocument();
    });

    it('handles zero completed tasks empathetically', () => {
      render(
        <ReflectionForm
          sessionDate="2026-11-15"
          completedTasks={[]}
          incompleteTasks={[]}
          onCompleteShutdown={vi.fn()}
        />
      );

      expect(screen.getByText(/Zero tasks completed today/i)).toBeInTheDocument();
    });
  });
});
