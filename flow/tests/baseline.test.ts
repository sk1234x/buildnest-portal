import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import HomePage from '@/app/page';

describe('Milestone 1 Test Runner & Health Check', () => {
  it('verifies Node.js runtime environment is version 25.x', () => {
    const nodeVersion = process.versions.node;
    const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
    expect(majorVersion).toBe(25);
  });

  it('verifies DOM and browser environment is jsdom', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    expect(typeof navigator).toBe('object');
    expect(window.matchMedia).toBeDefined();
    expect(global.ResizeObserver).toBeDefined();
  });

  it('resolves project path alias @/* and renders HomePage cleanly', () => {
    render(React.createElement(HomePage));
    const heading = screen.getByRole('heading', { level: 1, name: 'Flow — Activity Planner' });
    expect(heading).toBeInTheDocument();
  });

  it('verifies Jest DOM matchers function properly', () => {
    const testDiv = document.createElement('div');
    testDiv.setAttribute('id', 'anchor-test');
    testDiv.textContent = 'Morning Launchpad';
    document.body.appendChild(testDiv);

    expect(testDiv).toBeInTheDocument();
    expect(testDiv).toHaveAttribute('id', 'anchor-test');
    expect(testDiv).toHaveTextContent('Morning Launchpad');

    document.body.removeChild(testDiv);
  });
});
