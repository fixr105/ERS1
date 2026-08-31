'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(15, 15, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-default)',
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            className="stage-dot active"
            style={{ width: 32, height: 32, fontSize: 13 }}
          >
            {currentStage}
          </div>
          <div>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
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
          {/* Jump to Stage dropdown — for testing */}
          <div ref={jumpRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setJumpOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-bright)',
                borderRadius: 8,
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              title="Jump to any stage (for testing)"
            >
              <SkipForward size={14} />
              Jump to Stage
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>

            {jumpOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-bright)',
                  borderRadius: 10,
                  boxShadow: '0 12px 40px #00000060',
                  padding: 6,
                  minWidth: 200,
                  zIndex: 200,
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    padding: '8px 12px 6px',
                    fontWeight: 600,
                  }}
                >
                  Testing Navigation
                </p>
                {stages.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => handleJump(stage)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: stage === currentStage ? 'var(--accent-light)' : 'var(--text-secondary)',
                      fontWeight: stage === currentStage ? 600 : 400,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'none';
                    }}
                  >
                    <span
                      className={`stage-dot ${stage === currentStage ? 'active' : 'pending'}`}
                      style={{ width: 22, height: 22, fontSize: 10 }}
                    >
                      {stage}
                    </span>
                    {STAGE_NAMES[stage]}
                    {stage === currentStage && (
                      <Check size={14} style={{ marginLeft: 'auto' }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>Seven </span>
            <span
              style={{
                background: 'var(--grad-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Fincorp
            </span>
          </span>
        </div>
      </header>

      <style>{`
        @media (max-width: 768px) {
          header { padding: 10px 16px !important; }
        }
      `}</style>
    </>
  );
}

export const StageRail = ReviewTopBar;
