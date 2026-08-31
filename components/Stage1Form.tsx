'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useReview } from '@/context/ReviewContext';
import { useToast } from '@/components/ToastProvider';
import { submitStage1 } from '@/lib/webhooks';
import type { Stage1Data } from '@/lib/types';
import { ErrorCard } from '@/components/ErrorCard';
import { useKeyboardEnforcement } from '@/hooks/use-keyboard-enforcement';
import { KeyboardGateModal, KeyboardStatusBar, KeystrokeCounter } from '@/components/KeyboardEnforcement';

const QUESTIONS = [
  { key: 'overallPerformance', label: 'How would you describe your overall performance this month?', minChars: 100 },
  { key: 'biggestWins', label: 'What were your 2–3 biggest wins this month?', minChars: 80 },
  { key: 'whatWentWrong', label: 'What went wrong or didn\'t go as planned?', minChars: 80 },
  { key: 'whatCouldBeDifferent', label: 'What could you have done differently?', minChars: 80 },
  { key: 'projectsConsumedTime', label: 'Which projects consumed the most of your time?', minChars: 80 },
  { key: 'feltStuckOrUnsupported', label: 'Where did you feel stuck or unsupported?', minChars: 80 },
] as const;

export function Stage1Form({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const { state, setStage1, setSessionId } = useReview();
  const { toast } = useToast();

  const [answers, setAnswers] = useState<Record<string, string>>(
    state.stage1
      ? {
          overallPerformance: state.stage1.overallPerformance,
          biggestWins: state.stage1.biggestWins,
          whatWentWrong: state.stage1.whatWentWrong,
          whatCouldBeDifferent: state.stage1.whatCouldBeDifferent,
          projectsConsumedTime: state.stage1.projectsConsumedTime,
          feltStuckOrUnsupported: state.stage1.feltStuckOrUnsupported,
        }
      : {},
  );
  const [selfRating, setSelfRating] = useState(state.stage1?.selfRating ?? 5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stageStartTime = useRef(Date.now());

  const fieldKeys = QUESTIONS.map((q) => q.key);
  const { showGate, dismissGate, recordKeystroke, keystrokes, isFieldValid, getMismatchCount } =
    useKeyboardEnforcement(fieldKeys);

  const getCharCount = (text: string) => text.length;

  const allValid = QUESTIONS.every((q) => isFieldValid(q.key, answers[q.key] || '', q.minChars));
  const mismatchCount = getMismatchCount(QUESTIONS.map((q) => ({ key: q.key, text: answers[q.key] || '' })));

  const handleChange = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!allValid) return;
    setSubmitting(true);
    setError(null);

    const stage1Data: Stage1Data = {
      overallPerformance: answers.overallPerformance || '',
      biggestWins: answers.biggestWins || '',
      whatWentWrong: answers.whatWentWrong || '',
      whatCouldBeDifferent: answers.whatCouldBeDifferent || '',
      projectsConsumedTime: answers.projectsConsumedTime || '',
      feltStuckOrUnsupported: answers.feltStuckOrUnsupported || '',
      selfRating,
    };

    try {
      const timeSpentSeconds = Math.round((Date.now() - stageStartTime.current) / 1000);
      const result = await submitStage1(
        employeeId,
        state.employeeName,
        state.sessionId,
        state.month,
        state.year,
        {
          ...stage1Data,
          selfRating,
        },
        timeSpentSeconds,
      );
      if (result.sessionId) setSessionId(result.sessionId);
      setStage1(stage1Data);
      toast('Self assessment saved', 'success');
      router.push(`/review/${employeeId}/2`);
    } catch (err) {
      console.error('Webhook failed:', err);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (showGate) {
    return (
      <KeyboardGateModal
        title="Keyboard-Only Assessment Mode"
        description="This self-assessment is conducted in keyboard-only mode to ensure authentic, real-time responses. Before you begin, please review the rules below."
        onConfirm={dismissGate}
      />
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h1
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: '-0.02em',
          marginBottom: 8,
        }}
      >
        How was your month, {state.employeeName.split(' ')[0]}?
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 20 }}>
        Answer honestly. This shapes every stage that follows.
      </p>

      <KeyboardStatusBar />

      {error && <div style={{ marginBottom: 24 }}><ErrorCard message={error} onRetry={handleSubmit} /></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {QUESTIONS.map((q, idx) => {
          const value = answers[q.key] || '';
          const chars = getCharCount(value);
          const valid = chars >= q.minChars;
          return (
            <div key={q.key} className="grad-border" style={{ padding: 24 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: 12,
                }}
              >
                <span style={{ color: 'var(--accent-light)', marginRight: 8 }}>{idx + 1}.</span>
                {q.label}
              </label>
              <textarea
                className="input-field"
                value={value}
                data-keyboard-only="true"
                onPaste={(e) => { e.preventDefault(); toast('Paste is disabled — keyboard input only', 'error'); }}
                onContextMenu={(e) => e.preventDefault()}
                onKeyPress={() => recordKeystroke(q.key)}
                onChange={(e) => handleChange(q.key, e.target.value)}
                rows={4}
                placeholder="Type your answer..."
                style={{ minHeight: 100 }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 8,
                  fontSize: 12,
                }}
              >
                <span style={{ color: valid ? 'var(--success)' : 'var(--text-muted)' }}>
                  {chars} / {q.minChars} chars
                </span>
                <KeystrokeCounter
                  keystrokes={keystrokes[q.key] || 0}
                  chars={chars}
                  mismatch={chars > 0 && (keystrokes[q.key] || 0) < chars}
                />
              </div>
            </div>
          );
        })}

        {/* Self rating slider */}
        <div className="grad-border active" style={{ padding: 24 }}>
          <label
            style={{
              display: 'block',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: 20,
            }}
          >
            <span style={{ color: 'var(--accent-light)', marginRight: 8 }}>7.</span>
            Rate your own performance this month.
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: 48,
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
              className="grad-text"
            >
              {selfRating}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>/ 10</span>
          </div>

          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={selfRating}
            onPointerDown={(e) => {
              e.preventDefault();
              const el = e.currentTarget;
              const rect = el.getBoundingClientRect();
              const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              setSelfRating(Math.round(1 + ratio * 9));
              el.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 0) return;
              e.preventDefault();
              const el = e.currentTarget;
              const rect = el.getBoundingClientRect();
              const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              setSelfRating(Math.round(1 + ratio * 9));
            }}
            aria-label="Self rating"
            style={{ width: '100%' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            <span>Needs Work</span>
            <span>Excellent</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!allValid || submitting || mismatchCount > 0}
          style={{ padding: '14px 28px' }}
          title={mismatchCount > 0 ? 'Keystroke count must match character count' : !allValid ? 'All fields require minimum characters' : undefined}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save &amp; Continue
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
