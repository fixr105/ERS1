const STORAGE_KEY = 'ers-timing-tickets-v1';

type TicketStore = Record<string, Record<string, string>>;

function readStore(): TicketStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TicketStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: TicketStore): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getTimingTicket(sessionId: string, fieldId: string): string | undefined {
  return readStore()[sessionId]?.[fieldId];
}

export function getTimingTickets(sessionId: string): Record<string, string> {
  return { ...(readStore()[sessionId] || {}) };
}

export function saveTimingTicket(sessionId: string, fieldId: string, ticket: string): void {
  const store = readStore();
  store[sessionId] = { ...(store[sessionId] || {}), [fieldId]: ticket };
  writeStore(store);
}

export async function ensureTimingTicket(sessionId: string, fieldId: string): Promise<string | undefined> {
  const existing = getTimingTicket(sessionId, fieldId);
  if (existing) return existing;
  try {
    const res = await fetch('/api/anti-ai/ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sessionId, fieldId }),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { ticket?: string };
    if (!data.ticket) return undefined;
    saveTimingTicket(sessionId, fieldId, data.ticket);
    return data.ticket;
  } catch {
    return undefined;
  }
}

export async function evaluateAnswerTiming(
  sessionId: string,
  fieldIds: string[],
): Promise<{ flaggedCount: number; flags: Record<string, boolean>; invalidateReport: boolean }> {
  const tickets = getTimingTickets(sessionId);
  const res = await fetch('/api/anti-ai/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sessionId,
      items: fieldIds.map((fieldId) => ({ fieldId, ticket: tickets[fieldId] })),
    }),
  });
  if (!res.ok) {
    return {
      flaggedCount: fieldIds.length,
      flags: Object.fromEntries(fieldIds.map((id) => [id, true])),
      invalidateReport: fieldIds.length > 1,
    };
  }
  return res.json();
}
