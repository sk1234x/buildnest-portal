import { NextRequest, NextResponse } from 'next/server';
import { assertAuthenticatedAndWhitelisted } from '@/lib/auth/whitelist';
import { executeUnstickWithBreaker } from '@/lib/unstick/circuit-breaker';
import { getDeterministicFallback } from '@/lib/unstick/catalog';
import type { UnstickRequest } from '@/lib/unstick/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // 1. Security Gatekeeper: Boundary 3 Server Guard
  try {
    await assertAuthenticatedAndWhitelisted();
  } catch (authError: any) {
    const errorMsg = String(authError?.message || '');
    if (
      errorMsg.includes('Forbidden') ||
      errorMsg.includes('not whitelisted') ||
      errorMsg.includes('Whitelist Access Required')
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Whitelist Access Required' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. Safe Payload Extraction: Never crash on empty or non-JSON payloads
  let unstickReq: UnstickRequest = {};
  try {
    const body = await request.json();
    if (body && typeof body === 'object') {
      unstickReq = {
        currentRoutine: body.currentRoutine,
        energyLevel: typeof body.energyLevel === 'number' ? body.energyLevel : undefined,
        stuckContext: typeof body.stuckContext === 'string' ? body.stuckContext.slice(0, 500) : undefined,
        preferredCategory: body.preferredCategory,
      };
    }
  } catch {
    // Body is empty or not JSON; proceed with defaults
    unstickReq = {};
  }

  // 3. Resilient Task Execution via Circuit Breaker
  try {
    const { task, metadata } = await executeUnstickWithBreaker(unstickReq);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Flow-Unstick-Source': metadata.source,
      'X-Flow-Latency-Ms': String(metadata.latencyMs),
    };

    if (metadata.fallbackReason) {
      headers['X-Flow-Fallback-Reason'] = metadata.fallbackReason;
    }

    return NextResponse.json(task, {
      status: 200,
      headers,
    });
  } catch {
    // 4. Catastrophic Fallback Catch: Zero-500 guarantee for authenticated users
    const fallback = getDeterministicFallback(unstickReq);
    return NextResponse.json(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Flow-Unstick-Source': 'fallback_pool',
        'X-Flow-Fallback-Reason': 'catastrophic_safety_catch',
        'X-Flow-Latency-Ms': String(Date.now() - startTime),
      },
    });
  }
}
