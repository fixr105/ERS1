export interface StoredReviewProgress {
  sessionId: string;
  lastCompletedStage: number;
  month: string;
  year: number;
}

const STORAGE_KEY = 'ers-review-progress-v1';

type ProgressMap = Record<string, StoredReviewProgress>;

function readAll(): ProgressMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: ProgressMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getReviewProgress(
  employeeId: string,
  month: string,
  year: number,
): StoredReviewProgress | null {
  const entry = readAll()[employeeId];
  if (!entry) return null;
  if (entry.month !== month || entry.year !== year) return null;
  return entry;
}

export function saveReviewProgress(
  employeeId: string,
  month: string,
  year: number,
  sessionId: string,
  lastCompletedStage: number,
): void {
  const map = readAll();
  const prev = map[employeeId];
  const samePeriod = prev && prev.month === month && prev.year === year;
  map[employeeId] = {
    sessionId: sessionId || (samePeriod ? prev.sessionId : '') || '',
    lastCompletedStage: samePeriod
      ? Math.max(prev.lastCompletedStage, lastCompletedStage)
      : lastCompletedStage,
    month,
    year,
  };
  writeAll(map);
}

export function resumeStageForProgress(lastCompletedStage: number): number {
  if (!lastCompletedStage || lastCompletedStage < 1) return 1;
  return Math.min(5, lastCompletedStage);
}
