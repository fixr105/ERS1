import { createHmac, timingSafeEqual } from 'crypto';
import { isAnsweredWithAi, minMsForField } from './antiAiTiming';

interface TicketPayload {
  s: string;
  f: string;
  i: number;
}

const TICKET_SECRET = 'ers-mtir-timing-ticket-v1';

function secret(): string {
  return TICKET_SECRET;
}

function sign(encoded: string): string {
  return createHmac('sha256', secret()).update(encoded).digest('base64url');
}

export function issueTimingTicket(sessionId: string, fieldId: string, nowMs = Date.now()): string {
  const payload: TicketPayload = { s: sessionId, f: fieldId, i: nowMs };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function readTimingTicket(ticket: string, sessionId: string, fieldId: string): TicketPayload | null {
  const parts = ticket.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = sign(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TicketPayload;
    if (payload.s !== sessionId || payload.f !== fieldId) return null;
    if (!Number.isFinite(payload.i)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function evaluateTimingItems(
  sessionId: string,
  items: { fieldId: string; ticket?: string }[],
  nowMs = Date.now(),
): { flags: Record<string, boolean>; flaggedCount: number; flaggedFields: string[] } {
  const flags: Record<string, boolean> = {};
  for (const item of items) {
    const payload = item.ticket ? readTimingTicket(item.ticket, sessionId, item.fieldId) : null;
    flags[item.fieldId] = isAnsweredWithAi(payload?.i ?? null, nowMs, minMsForField(item.fieldId));
  }
  const flaggedFields = Object.entries(flags).filter(([, flagged]) => flagged).map(([id]) => id);
  return { flags, flaggedCount: flaggedFields.length, flaggedFields };
}
