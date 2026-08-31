'use client';

import { ReactNode, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReview } from '@/context/ReviewContext';

export function SessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ employeeId: string }>();
  const { state } = useReview();
  const urlEmployeeId = params.employeeId;
  const hasSession = Boolean(state.employeeId && state.sessionId);
  const matchesUrl = !urlEmployeeId || state.employeeId === urlEmployeeId;

  useEffect(() => {
    if (!hasSession || !matchesUrl) {
      router.replace('/');
    }
  }, [hasSession, matchesUrl, router]);

  if (!hasSession || !matchesUrl) {
    return (
      <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Returning to the start of the review…
      </p>
    );
  }

  return <>{children}</>;
}
