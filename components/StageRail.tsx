'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, SkipForward, ChevronDown } from 'lucide-react';
import { useReview } from '@/context/ReviewContext';
import { STAGE_NAMES } from '@/lib/types';

export function ReviewTopBar() {
  const params = useParams<{ employeeId: string; stage: string }>();
  const router = useRouter();
  const currentStage = parseInt(params.stage, 10);
  const { state } = useReview();
  const employeeId = state.employeeId || params.employeeId;
  const [jumpOpen, setJumpOpen] = useState(false);
  const jumpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (jumpRef.current && !jumpRef.current.contains(e.target as Node)) {
        setJumpOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const stages = [1, 2, 3, 4, 5];

  const handleJump = (stage: number) => {
    setJumpOpen(false);
    if (!employeeId) return;
    router.push(`/review/${employeeId}/${stage}`);
  };

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div ref={jumpRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setJumpOpen((o) => !o)}
              title="Jump to any stage (for testing)"
              style={{ minHeight: 36, padding: '6px 12px', fontSize: 12 }}
            >
              <SkipForward size={14} />
              Jump to Stage
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>

            {jumpOpen && (
              <div className="jump-menu">
                <p className="field-label" style={{ padding: '8px 12px 6px' }}>
                  Testing Navigation
                </p>
                {stages.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    className="employee-option"
                    onClick={() => handleJump(stage)}
                    style={{
                      color: stage === currentStage ? 'var(--accent-light)' : 'var(--text-secondary)',
                      fontWeight: stage === currentStage ? 600 : 400,
                      borderRadius: 6,
                    }}
                  >
                    <span
                      className={`stage-dot ${stage === currentStage ? 'active' : 'pending'}`}
                      style={{ width: 22, height: 22, fontSize: 10 }}
                    >
                      {stage}
                    </span>
                    {STAGE_NAMES[stage]}
                    {stage === currentStage && <Check size={14} style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link href="/" className="brand-mark">
            Seven Fincorp
          </Link>
        </div>
      </div>
    </header>
  );
}

export const StageRail = ReviewTopBar;
