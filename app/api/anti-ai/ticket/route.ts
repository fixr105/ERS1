import { NextResponse } from 'next/server';
import { issueTimingTicket } from '@/lib/antiAiTickets.server';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { sessionId?: string; fieldId?: string } | null;
  const sessionId = String(body?.sessionId || '').trim();
  const fieldId = String(body?.fieldId || '').trim();
  if (!sessionId || !fieldId) {
    return NextResponse.json({ error: 'sessionId and fieldId required' }, { status: 400 });
  }
  return NextResponse.json({ ticket: issueTimingTicket(sessionId, fieldId) });
}
