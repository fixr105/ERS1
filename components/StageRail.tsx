'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useReview } from '@/context/ReviewContext';
import { STAGE_NAMES } from '@/lib/types';

export function ReviewTopBar() {
  const params = useParams<{ employeeId: string; stage: string }>();
  const currentStage = parseInt(params.stage, 10);
  const { state } = useReview();

  return (
    <header className="review-topbar">
      <div className="review-topbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <div className="stage-dot active">{currentStage}</div>
          <div style={{ minWidth: 0 }}>
            <p className="heading-display" style={{ fontSize: 15, letterSpacing: '-0.03em' }}>
              {STAGE_NAMES[currentStage] || 'Review'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {state.employeeName || '—'} ·{' '}
              {state.month || new Date().toLocaleString('en-US', { month: 'long' })}{' '}
              {state.year || new Date().getFullYear()}
            </p>
          </div>
        </div>

        <Link href="/" className="brand-mark">
          Seven Fincorp
        </Link>
      </div>
    </header>
  );
}

export const StageRail = ReviewTopBar;
