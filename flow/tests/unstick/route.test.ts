import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/unstick/route';
import * as whitelistModule from '@/lib/auth/whitelist';
import * as circuitBreakerModule from '@/lib/unstick/circuit-breaker';

vi.mock('@/lib/auth/whitelist', () => ({
  assertAuthenticatedAndWhitelisted: vi.fn(),
}));

describe('Unstick API Route Integration Suite (/api/unstick)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns HTTP 401 Unauthorized when user is unauthenticated', async () => {
    vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockRejectedValue(
      new Error('Unauthorized: No active session')
    );

    const request = new NextRequest('http://localhost:3000/api/unstick', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns HTTP 403 Forbidden when user is authenticated but not whitelisted', async () => {
    vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockRejectedValue(
      new Error('Forbidden: User email is not whitelisted')
    );

    const request = new NextRequest('http://localhost:3000/api/unstick', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe('Forbidden: Whitelist Access Required');
  });

  it('returns HTTP 200 with gemini_llm task and telemetry headers when whitelisted and LLM succeeds', async () => {
    vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockResolvedValue({
      userId: 'user_123',
      email: 'builder@buildnest.buzz',
    });

    const mockTask = {
      id: 'gemini_999_xyz',
      title: 'Postural Reset',
      instruction: 'Interlace fingers behind back and lift chest upward for 5 slow breaths.',
      durationMinutes: 2,
      category: 'physical_somatic' as const,
      whyItWorks: 'Reverses forward slumping and expands lung volume.',
      source: 'gemini_llm' as const,
    };

    vi.spyOn(circuitBreakerModule, 'executeUnstickWithBreaker').mockResolvedValue({
      task: mockTask,
      metadata: {
        source: 'gemini_llm',
        latencyMs: 142,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/unstick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentRoutine: 'morning_launchpad', energyLevel: 3 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(response.headers.get('X-Flow-Unstick-Source')).toBe('gemini_llm');
    expect(response.headers.get('X-Flow-Latency-Ms')).toBe('142');

    const data = await response.json();
    expect(data.id).toBe(mockTask.id);
    expect(data.title).toBe(mockTask.title);
    expect(data.source).toBe('gemini_llm');
    expect(data.durationMinutes).toBe(2);
  });

  it('returns HTTP 200 with fallback task and fallback reason when circuit breaker degrades', async () => {
    vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockResolvedValue({
      userId: 'user_123',
      email: 'builder@buildnest.buzz',
    });

    const mockFallbackTask = {
      id: 'phys-1',
      title: 'The 2-Minute Body Shakeout',
      instruction: 'Stand up immediately. Shake your hands for 30s, shake your legs for 30s, and roll your shoulders 10 times to dispel sympathetic nervous system freeze.',
      durationMinutes: 2,
      category: 'physical_somatic' as const,
      whyItWorks: 'Discharges stagnant adrenaline and activates the somatic motor loop to break cognitive paralysis.',
      source: 'fallback_pool' as const,
    };

    vi.spyOn(circuitBreakerModule, 'executeUnstickWithBreaker').mockResolvedValue({
      task: mockFallbackTask,
      metadata: {
        source: 'fallback_pool',
        latencyMs: 2505,
        fallbackReason: 'circuit_breaker_timeout',
      },
    });

    const request = new NextRequest('http://localhost:3000/api/unstick', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Flow-Unstick-Source')).toBe('fallback_pool');
    expect(response.headers.get('X-Flow-Fallback-Reason')).toBe('circuit_breaker_timeout');

    const data = await response.json();
    expect(data.id).toBe('phys-1');
    expect(data.source).toBe('fallback_pool');
  });

  it('gracefully handles empty, missing, or malformed JSON body without error', async () => {
    vi.spyOn(whitelistModule, 'assertAuthenticatedAndWhitelisted').mockResolvedValue({
      userId: 'user_123',
      email: 'builder@buildnest.buzz',
    });

    // Request with non-JSON text
    const request = new NextRequest('http://localhost:3000/api/unstick', {
      method: 'POST',
      body: 'this-is-not-json',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.durationMinutes).toBeGreaterThanOrEqual(2);
    expect(data.durationMinutes).toBeLessThanOrEqual(5);
  });
});
