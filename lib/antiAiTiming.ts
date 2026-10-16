export const STAGE1_TEXT_MIN_MS = 45_000;
export const STAGE3_TEXT_MIN_MS = 45_000;
export const STAGE2_EDIT_MIN_MS = 25_000;

export type TimingFieldKind = 'stage1' | 'stage2' | 'stage3';

export function minMsForField(fieldId: string): number {
  if (fieldId.startsWith('s1.')) return STAGE1_TEXT_MIN_MS;
  if (fieldId.startsWith('s2.')) return STAGE2_EDIT_MIN_MS;
  if (fieldId.startsWith('s3.')) return STAGE3_TEXT_MIN_MS;
  return STAGE1_TEXT_MIN_MS;
}

export function isAnsweredWithAi(ticketIssuedAtMs: number | null, nowMs: number, minMs: number): boolean {
  if (ticketIssuedAtMs == null || !Number.isFinite(ticketIssuedAtMs)) return true;
  return nowMs - ticketIssuedAtMs < minMs;
}

export function shouldInvalidateReport(flaggedCount: number): boolean {
  return flaggedCount > 1;
}

export function stage1FieldId(key: string): string {
  return `s1.${key}`;
}

export function stage2SummaryFieldId(): string {
  return 's2.editedSummary';
}

export function stage3FieldId(questionId: string): string {
  return `s3.${questionId}`;
}

const STAGE1_TEXT_KEYS = [
  'overallPerformance',
  'biggestWins',
  'whatWentWrong',
  'whatCouldBeDifferent',
  'projectsConsumedTime',
  'feltStuckOrUnsupported',
] as const;

export function timingFieldsForReview(input: {
  stage1?: Record<string, unknown> | null;
  stage2?: { summaryEdited?: boolean } | null;
  stage3?: { answers?: { questionId: string; answer: string }[] } | null;
}): string[] {
  const fields: string[] = [];
  if (input.stage1) {
    for (const key of STAGE1_TEXT_KEYS) {
      if (String(input.stage1[key] ?? '').trim()) fields.push(stage1FieldId(key));
    }
  }
  if (input.stage2?.summaryEdited) fields.push(stage2SummaryFieldId());
  for (const answer of input.stage3?.answers || []) {
    if (answer.answer.trim()) fields.push(stage3FieldId(answer.questionId));
  }
  return fields;
}
