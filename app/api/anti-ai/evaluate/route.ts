import { NextResponse } from 'next/server';
import { evaluateTimingItems } from '@/lib/antiAiTickets.server';
import { shouldInvalidateReport } from '@/lib/antiAiTiming';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    sessionId?: string;
    items?: { fieldId: string; ticket?: string }[];
  } | null;
  const sessionId = String(body?.sessionId || '').trim();
  const items = Array.isArray(body?.items) ? body!.items : [];
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  const result = evaluateTimingItems(sessionId, items);
  return NextResponse.json({
    ...result,
    invalidateReport: shouldInvalidateReport(result.flaggedCount),
  });
}
