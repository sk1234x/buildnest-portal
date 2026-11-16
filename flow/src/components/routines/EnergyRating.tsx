'use client';

import React from 'react';

export interface EnergyRatingProps {
  value?: number; // 1 to 5
  onChange: (level: number) => void;
  disabled?: boolean;
  className?: string;
}

const ENERGY_LEVELS = [
  {
    level: 1,
    emoji: '😴',
    label: 'Drained',
    description: 'Low-friction start, tiny micro-steps only',
  },
  {
    level: 2,
    emoji: '🌤️',
    label: 'Low',
    description: 'Gentle momentum, gentle ramp-up',
  },
  {
    level: 3,
    emoji: '⚡',
    label: 'Steady',
    description: 'Moderate energy, ready for focused work',
  },
  {
    level: 4,
    emoji: '🚀',
    label: 'High',
    description: 'High drive, prime state for keystone challenge',
  },
  {
    level: 5,
    emoji: '🔥',
    label: 'Peak',
    description: 'Maximum flow, deep creative/strategic surge',
  },
];

export function EnergyRating({
  value,
  onChange,
  disabled = false,
  className = '',
}: EnergyRatingProps) {
  const handleKeyDown = (e: React.KeyboardEvent, currentLevel: number) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(5, (value || currentLevel) + 1);
      onChange(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = Math.max(1, (value || currentLevel) - 1);
      onChange(prev);
    }
  };

  return (
    <div
      data-testid="energy-rating"
      className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            Nervous System & Energy Check-In
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Calibrate today&apos;s routine to your genuine internal state (1 to 5).
          </p>
        </div>
        {value && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Level {value} of 5
          </span>
        )}
      </div>

      {/* 5 Tactile Rating Cards */}
      <div
        role="radiogroup"
        aria-label="Daily Energy Rating"
        className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-5"
      >
        {ENERGY_LEVELS.map(({ level, emoji, label, description }) => {
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Energy level ${level}: ${label}. ${description}`}
              disabled={disabled}
              onClick={() => onChange(level)}
              onKeyDown={(e) => handleKeyDown(e, level)}
              className={`relative flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                  : 'border-border bg-card/50 hover:border-border/80 hover:bg-muted/40'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <span className="text-2xl sm:text-3xl" role="img" aria-hidden="true">
                {emoji}
              </span>
              <span
                className={`mt-2 text-xs font-bold sm:text-sm ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
              >
                {level}. {label}
              </span>
              <span className="mt-1 line-clamp-2 text-[10px] text-muted-foreground sm:text-xs">
                {description}
              </span>

              {isSelected && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
