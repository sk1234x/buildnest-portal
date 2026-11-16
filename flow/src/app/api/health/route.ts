import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'flow.buildnest.buzz',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
