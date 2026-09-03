'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useReview } from '@/context/ReviewContext';
import { useToast } from '@/components/ToastProvider';
import { isAirtableRecordId, submitStage1 } from '@/lib/webhooks';
import type { Stage1Data } from '@/lib/types';
import { ErrorCard } from '@/components/ErrorCard';
import { saveReviewProgress } from '@/lib/reviewProgress';
import { NoiseButton } from '@/components/ui/noise-button';

const QUESTIONS = [
  { key: 'overallPerformance', label: 'How would you describe your overall performance this month?' },
  { key: 'biggestWins', label: 'What were your 2–3 biggest wins this month?' },
  { key: 'whatWentWrong', label: 'What went wrong or didn\'t go as planned?' },
  { key: 'whatCouldBeDifferent', label: 'What could you have done differently?' },
  { key: 'projectsConsumedTime', label: 'Which projects consumed the most of your time?' },
  { key: 'feltStuckOrUnsupported', label: 'Where did you feel stuck or unsupported?' },
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

  const allFilled = QUESTIONS.every((q) => (answers[q.key] || '').trim().length > 0);

  const goNext = (stage1Data: Stage1Data) => {
    setStage1(stage1Data);
    router.push(`/review/${employeeId}/2`);
  };

  const handleSubmit = async () => {
    if (!allFilled || submitting) return;
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
        { ...stage1Data, selfRating },
        timeSpentSeconds,
      );
      if (!isAirtableRecordId(result.sessionId)) {
        throw new Error('Session was not created on the server');
      }
      setSessionId(result.sessionId);
      saveReviewProgress(employeeId, state.month, state.year, result.sessionId, 1);
      toast('Self assessment saved', 'success');
      goNext(stage1Data);
    } catch (err) {
      console.error('Webhook failed:', err);
      const message = err instanceof Error ? err.message : 'Could not save self assessment. Please try again.';
      setError(message);
      toast('Could not save self assessment. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <h1
        style={{
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: '-0.02em',
          marginBottom: 8,
        }}
      >
        How was your month, {state.employeeName.trim().split(/\s+/)[0] || 'there'}?
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28 }}>
        Answer each question, then continue.
      </p>

      {error && (
        <div style={{ marginBottom: 24 }}>
          <ErrorCard message={error} onRetry={handleSubmit} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {QUESTIONS.map((q, idx) => {
          const value = answers[q.key] || '';
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
                onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                rows={4}
                placeholder="Type your answer..."
                style={{ minHeight: 100 }}
              />
            </div>
          );
        })}

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
              className="grad-text"
              style={{
                fontWeight: 500,
                fontSize: 48,
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
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
            onChange={(e) => setSelfRating(Number(e.target.value))}
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

      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
        <NoiseButton
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!allFilled || submitting}
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
        </NoiseButton>
      </div>
    </div>
  );
}
