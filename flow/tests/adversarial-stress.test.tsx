import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import RootLayout from '@/app/layout';
import HomePage from '@/app/page';

describe('Adversarial Stress Test: Polyfill Fidelity & Edge Cases', () => {
  it('polyfilled window.ResizeObserver vs global.ResizeObserver', () => {
    // Check if window.ResizeObserver is defined when code accesses window.ResizeObserver
    expect(global.ResizeObserver).toBeDefined();
    expect(window.ResizeObserver).toBeDefined();
    expect(window.ResizeObserver).toBe(global.ResizeObserver);

    // Stress test ResizeObserver instantiation and methods
    let callbackCalled = false;
    const observer = new window.ResizeObserver((entries) => {
      callbackCalled = true;
    });

    expect(typeof observer.observe).toBe('function');
    expect(typeof observer.unobserve).toBe('function');
    expect(typeof observer.disconnect).toBe('function');

    const dummyEl = document.createElement('div');
    expect(() => observer.observe(dummyEl)).not.toThrow();
    expect(() => observer.unobserve(dummyEl)).not.toThrow();
    expect(() => observer.disconnect()).not.toThrow();
  });

  it('polyfilled window.matchMedia behavior and listener interface', () => {
    expect(window.matchMedia).toBeDefined();
    const query = '(prefers-color-scheme: dark)';
    const mql = window.matchMedia(query);

    expect(mql.media).toBe(query);
    expect(typeof mql.matches).toBe('boolean');
    expect(typeof mql.addEventListener).toBe('function');
    expect(typeof mql.removeEventListener).toBe('function');
    expect(typeof mql.addListener).toBe('function');
    expect(typeof mql.removeListener).toBe('function');
    expect(typeof mql.dispatchEvent).toBe('function');

    // Test that listeners do not throw
    const dummyListener = vi.fn();
    expect(() => mql.addEventListener('change', dummyListener)).not.toThrow();
    expect(() => mql.removeEventListener('change', dummyListener)).not.toThrow();
    expect(() => mql.addListener(dummyListener)).not.toThrow();
    expect(() => mql.removeListener(dummyListener)).not.toThrow();
    expect(() => mql.dispatchEvent(new Event('change'))).not.toThrow();
  });

  it('allows matchMedia to be overridden for specific theme/viewport tests', () => {
    const originalMatchMedia = window.matchMedia;

    // Simulate custom theme query mock
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const darkMql = window.matchMedia('(prefers-color-scheme: dark)');
    const lightMql = window.matchMedia('(prefers-color-scheme: light)');

    expect(darkMql.matches).toBe(true);
    expect(lightMql.matches).toBe(false);

    // Restore
    window.matchMedia = originalMatchMedia;
  });
});

describe('Adversarial Stress Test: DOM Assertions & Matchers', () => {
  it('tests full spectrum of jest-dom matchers on complex elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <form id="test-form" aria-label="Test Routine Form">
        <label for="task-input">Task Title</label>
        <input id="task-input" type="text" value="Morning Stretch" required class="px-4 py-2 text-foreground" />
        <button type="submit" disabled class="btn-disabled">Submit</button>
        <div id="hidden-box" style="display: none;">Secret Content</div>
        <div id="aria-box" role="alert" aria-live="assertive">Inertia Breaking Alert</div>
      </form>
    `;
    document.body.appendChild(container);

    const input = screen.getByLabelText('Task Title') as HTMLInputElement;
    const button = screen.getByRole('button', { name: 'Submit' });
    const alert = screen.getByRole('alert');
    const hiddenBox = document.getElementById('hidden-box');

    // DOM Matcher tests
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Morning Stretch');
    expect(input).toBeRequired();
    expect(input).toHaveClass('px-4', 'py-2', 'text-foreground');
    expect(button).toBeDisabled();
    expect(alert).toHaveTextContent(/inertia breaking alert/i);
    expect(alert).toBeVisible();
    expect(hiddenBox).not.toBeVisible();

    document.body.removeChild(container);
  });
});

describe('Adversarial Stress Test: Root Layout Accessibility & Landmarks', () => {
  it('renders HomePage with accessible headings and semantic navigation', () => {
    render(<HomePage />);

    // Check headings hierarchy
    const h1 = screen.getByRole('heading', { level: 1, name: /flow — activity planner/i });
    expect(h1).toBeInTheDocument();

    const h2s = screen.getAllByRole('heading', { level: 2 });
    expect(h2s.length).toBeGreaterThanOrEqual(2);

    // Check interactive buttons / links
    const getStartedBtns = screen.getAllByRole('link', { name: /get started/i });
    expect(getStartedBtns.length).toBeGreaterThanOrEqual(1);
    expect(getStartedBtns[0]).toHaveAttribute('href', '/dashboard');

    const signInBtns = screen.getAllByRole('link', { name: /sign in/i });
    expect(signInBtns.length).toBeGreaterThanOrEqual(1);
    expect(signInBtns[0]).toHaveAttribute('href', '/login');
  });

  it('validates RootLayout component tree: lang="en", meta color-scheme, and landmark hierarchy', () => {
    // Inspect RootLayout JSX tree directly
    const layoutTree = RootLayout({
      children: React.createElement('div', { 'data-testid': 'mock-page' }, 'Mock Page Content'),
    }) as React.ReactElement<{
      lang: string;
      children: React.ReactNode[];
    }>;

    // Verify root html tag and lang attribute
    expect(layoutTree.type).toBe('html');
    expect(layoutTree.props.lang).toBe('en');

    // Verify head element and color-scheme meta tag
    const [headEl, bodyEl] = React.Children.toArray(layoutTree.props.children) as [
      React.ReactElement<{ children: React.ReactNode }>,
      React.ReactElement<{ children: React.ReactNode }>
    ];

    expect(headEl.type).toBe('head');
    const headChildren = React.Children.toArray(headEl.props.children) as React.ReactElement<any>[];
    const colorSchemeMeta = headChildren.find(
      (child) => child.type === 'meta' && child.props.name === 'color-scheme'
    );
    expect(colorSchemeMeta).toBeDefined();
    expect(colorSchemeMeta?.props.content).toBe('light dark');

    // Verify body element and landmark tags
    expect(bodyEl.type).toBe('body');
    const bodyChildren = React.Children.toArray(bodyEl.props.children) as React.ReactElement<any>[];

    // 1. Skip-to-content accessible link
    const skipLink = bodyChildren.find(
      (c) => c.type === 'a' && c.props.href === '#main-content'
    );
    expect(skipLink).toBeDefined();
    expect(skipLink?.props.className).toContain('sr-only');

    // 2. Main landmark with id="main-content" matching skip link
    const main = bodyChildren.find(
      (c) => c.type === 'main' && c.props.id === 'main-content'
    );
    expect(main).toBeDefined();

    // 3. Footer landmark
    const footer = bodyChildren.find((c) => c.type === 'footer');
    expect(footer).toBeDefined();
  });
});

describe('Adversarial Stress Test: Concurrent Test Execution', () => {
  it.concurrent('concurrent task 1: verifies environment isolation', async () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    await new Promise((r) => setTimeout(r, 10));
    expect(window.matchMedia).toBeDefined();
  });

  it.concurrent('concurrent task 2: verifies independent DOM operations', async () => {
    const el = document.createElement('span');
    el.id = 'concurrent-test-el';
    el.textContent = 'Independent concurrent';
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 10));
    expect(document.getElementById('concurrent-test-el')).toBeInTheDocument();
    document.body.removeChild(el);
  });

  it.concurrent('concurrent task 3: verifies timer and async resistance', async () => {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 25));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(15);
  });
});
