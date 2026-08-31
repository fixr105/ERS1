'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { ReviewState } from '@/lib/types';
import { INITIAL_REVIEW_STATE } from '@/lib/types';

interface ReviewContextValue {
  state: ReviewState;
  setEmployee: (id: string, name: string, department: string, role: string) => void;
  setSessionId: (sessionId: string) => void;
  setStage1: (data: ReviewState['stage1']) => void;
  setStage2: (data: ReviewState['stage2']) => void;
  setStage3: (data: ReviewState['stage3']) => void;
  setStage4: (data: ReviewState['stage4']) => void;
  setStage5: (data: ReviewState['stage5']) => void;
  reset: () => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReviewState>(INITIAL_REVIEW_STATE);

  const setEmployee = (id: string, name: string, department: string, role: string) => {
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const sessionId = `${id}-${now.getFullYear()}-${now.getMonth() + 1}-${Math.random().toString(36).slice(2, 10)}`;
    setState((s) => ({
      ...s,
      employeeId: id,
      employeeName: name.trim(),
      employeeDepartment: department,
      employeeRole: role,
      sessionId,
      month: monthName,
      year: now.getFullYear(),
    }));
  };

  const setSessionId = (sessionId: string) =>
    setState((s) => ({ ...s, sessionId }));

  const setStage1 = (data: ReviewState['stage1']) =>
    setState((s) => ({ ...s, stage1: data }));
  const setStage2 = (data: ReviewState['stage2']) =>
    setState((s) => ({ ...s, stage2: data }));
  const setStage3 = (data: ReviewState['stage3']) =>
    setState((s) => ({ ...s, stage3: data }));
  const setStage4 = (data: ReviewState['stage4']) =>
    setState((s) => ({ ...s, stage4: data }));
  const setStage5 = (data: ReviewState['stage5']) =>
    setState((s) => ({ ...s, stage5: data }));

  const reset = () => setState(INITIAL_REVIEW_STATE);

  return (
    <ReviewContext.Provider
      value={{ state, setEmployee, setSessionId, setStage1, setStage2, setStage3, setStage4, setStage5, reset }}
    >
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReview must be used within ReviewProvider');
  return ctx;
}
