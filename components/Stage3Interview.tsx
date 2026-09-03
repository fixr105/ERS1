'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Loader2, Check, AlertTriangle, Keyboard } from 'lucide-react';
import { useReview } from '@/context/ReviewContext';
import { useToast } from '@/components/ToastProvider';
import { getStage3Questions, submitStage3, type Stage3QuestionsResponse } from '@/lib/webhooks';
import type { InterviewQuestion, InterviewAnswer, Stage3Data } from '@/lib/types';
import { saveReviewProgress } from '@/lib/reviewProgress';
import { LoadingBar } from '@/components/Loading';
import { ErrorCard } from '@/components/ErrorCard';
import { useKeyboardEnforcement } from '@/hooks/use-keyboard-enforcement';
import { KeyboardGateModal, KeyboardStatusBar, KeystrokeCounter } from '@/components/KeyboardEnforcement';

const MIN_CHARS = 60;

export function Stage3Interview({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const { state, setStage3 } = useReview();
  const { toast } = useToast();

  const [loading, setLoading] = useState(!state.stage3);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [questions, setQuestions] = useState<InterviewQuestion[]>(state.stage3?.questions || []);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    state.stage3?.answers.forEach((a) => { map[a.questionId] = a.answer; });
    return map;
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stageStartTime = useRef(Date.now());
  const questionStartedAt = useRef(Date.now());
  const timeByQuestion = useRef<Record<string, number>>({});
  const pasteByQuestion = useRef<Record<string, number>>({});

  const questionKeys = questions.map((q) => q.id);
  const { showGate, dismissGate, recordKeystroke, keystrokes, isFieldValid, getFieldMismatch, getMismatchCount } =
    useKeyboardEnforcement(questionKeys);

  // Auto-focus the textarea when a new question loads (only after gate dismissed)
  useEffect(() => {
    if (!loading && !showSummary && !showGate && questions.length > 0) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, loading, showSummary, showGate, questions.length]);

  // Load questions
  useEffect(() => {
    if (state.stage3) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res: Stage3QuestionsResponse = await getStage3Questions(
          employeeId,
          state.sessionId,
          state.stage1,
          state.stage2,
        );
        if (!cancelled && res.questions?.length > 0) {
          setQuestions(res.questions);
        } else if (!cancelled) {
          throw new Error('No questions returned');
        }
      } catch (err) {
        console.error('Webhook failed:', err);
        if (!cancelled) setError('Something went wrong. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [employeeId, state.stage1, state.stage2, state.stage3, state.sessionId, retryKey]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 500, textAlign: 'center' }}>
          Generating your questions...
        </h2>
        <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shimmer" style={{ height: 16, width: `${80 - i * 5}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorCard message={error} onRetry={() => { setError(null); setRetryKey((k) => k + 1); }} />;
  }

  if (questions.length === 0) return null;

  if (showGate) {
    return (
      <KeyboardGateModal
        title="Keyboard-Only Interview Mode"
        description="This interview is conducted in keyboard-only mode to ensure authentic, real-time responses. Before you begin, please review the rules below."
        onConfirm={dismissGate}
      />
    );
  }

  // Summary view
  if (showSummary) {
    const answeredCount = Object.values(answers).filter((a) => a.length >= MIN_CHARS).length;
    const allAnswered = answeredCount === questions.length;
    const mismatchCount = getMismatchCount(
      questions.map((q) => ({ key: q.id, text: answers[q.id] || '' })),
    );

    const handleSubmit = async () => {
      if (!allAnswered || mismatchCount > 0) return;
      setSubmitting(true);
      const qa: InterviewAnswer[] = questions.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: answers[q.id] || '',
        category: q.category,
        charCount: (answers[q.id] || '').length,
        timeSeconds: timeByQuestion.current[q.id] || 0,
        pasteAttempts: pasteByQuestion.current[q.id] || 0,
      }));

      try {
        const timeSpentSeconds = Math.round((Date.now() - stageStartTime.current) / 1000);
        await submitStage3(
          employeeId,
          state.sessionId,
          qa,
          timeSpentSeconds,
          `${state.stage1?.overallPerformance || ''} ${state.stage2?.summary || ''}`.slice(0, 1000),
        );
        const stage3Data: Stage3Data = { questions, answers: qa };
        setStage3(stage3Data);
        saveReviewProgress(employeeId, state.month, state.year, state.sessionId, 3);
        toast('Interview submitted', 'success');
        router.push(`/review/${employeeId}/4`);
      } catch (err) {
        console.error('Webhook failed:', err);
        setError('Something went wrong. Please try again.');
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
          Interview Summary
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>
          Review your answers before submitting.
        </p>

        {error && (
          <div className="error-card">
            <span>&#9888; {error}</span>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map((q, i) => (
            <div key={q.id} className="glow-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <span className="badge badge-accent">Q{i + 1}</span>
                <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-bright)' }}>
                  {q.category}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: 'var(--text-primary)' }}>{q.question}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 12, borderLeft: '2px solid var(--border-bright)' }}>
                {answers[q.id] || <span style={{ color: 'var(--danger)' }}>Not answered</span>}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
          {mismatchCount > 0 && (
            <span style={{ fontSize: 12, color: 'var(--danger)', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              {mismatchCount} answer{mismatchCount > 1 ? 's' : ''} have keystroke mismatches
            </span>
          )}
          {!allAnswered && mismatchCount === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
              Answer every question ({answeredCount}/{questions.length}) before submitting.
            </span>
          )}
          <button className="btn-ghost" onClick={() => setShowSummary(false)}>
            <ArrowLeft size={16} />
            Back to Questions
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting || mismatchCount > 0 || !allAnswered}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Submit Interview
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Question view
  const currentQ = questions[currentIdx];
  const currentAnswer = answers[currentQ.id] || '';
  const chars = currentAnswer.length;
  const currentKeystrokes = keystrokes[currentQ.id] || 0;
  const hasMinChars = chars >= MIN_CHARS;
  const keystrokesMatch = currentKeystrokes >= chars;
  const isValid = hasMinChars && keystrokesMatch;
  const isLast = currentIdx === questions.length - 1;

  const handleNext = () => {
    if (!isValid) return;
    const elapsed = Math.round((Date.now() - questionStartedAt.current) / 1000);
    timeByQuestion.current[currentQ.id] = (timeByQuestion.current[currentQ.id] || 0) + elapsed;
    if (isLast) {
      setShowSummary(true);
    } else {
      questionStartedAt.current = Date.now();
      setCurrentIdx((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx === 0) return;
    const elapsed = Math.round((Date.now() - questionStartedAt.current) / 1000);
    timeByQuestion.current[currentQ.id] = (timeByQuestion.current[currentQ.id] || 0) + elapsed;
    questionStartedAt.current = Date.now();
    setCurrentIdx((i) => i - 1);
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
        The Interview
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 20 }}>
        Questions are based on your work and self-assessment. Answer in your own words.
      </p>

      <KeyboardStatusBar />

      {/* Progress bar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Question {currentIdx + 1} of {questions.length}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {Math.round(((currentIdx + 1) / questions.length) * 100)}%
          </span>
        </div>
        <div className="score-bar-wrap">
          <div className="score-bar-fill" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="grad-border active" style={{ padding: 32, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span className="badge badge-accent">Question {currentIdx + 1} of {questions.length}</span>
          <span className="badge badge-gold">{currentQ.category}</span>
        </div>

        <p
          style={{
            fontSize: 18,
            fontWeight: 500,
            lineHeight: 1.6,
            marginBottom: 24,
            color: 'var(--text-primary)',
          }}
        >
          &ldquo;{currentQ.question}&rdquo;
        </p>

        {/* Textarea with keyboard-only enforcement */}
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            className="input-field keyboard-only"
            value={currentAnswer}
            data-keyboard-only="true"
            onPaste={(e) => {
              e.preventDefault();
              pasteByQuestion.current[currentQ.id] = (pasteByQuestion.current[currentQ.id] || 0) + 1;
              toast('Paste is disabled — keyboard input only', 'error');
            }}
            onContextMenu={(e) => e.preventDefault()}
            onKeyPress={() => recordKeystroke(currentQ.id)}
            onChange={(e) => setAnswers((a) => ({ ...a, [currentQ.id]: e.target.value }))}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            rows={6}
            placeholder="Type your answer here..."
            style={{ minHeight: 140 }}
          />
          {showTooltip && (
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                background: 'var(--bg-elevated)',
                border: '1px solid #F8717130',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                pointerEvents: 'none',
              }}
            >
              <AlertTriangle size={12} />
              Keyboard input only — paste disabled
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            gap: 16,
          }}
        >
          <span style={{ fontSize: 12, color: hasMinChars ? 'var(--success)' : 'var(--text-muted)' }}>
            {chars} / {MIN_CHARS} chars minimum
          </span>
          <KeystrokeCounter
            keystrokes={currentKeystrokes}
            chars={chars}
            mismatch={chars > 0 && currentKeystrokes < chars}
          />
        </div>
      </div>

      {/* Navigation */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn-ghost"
          onClick={handlePrev}
          disabled={currentIdx === 0}
          style={currentIdx === 0 ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
        >
          <ArrowLeft size={16} />
          Previous
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={!isValid}
            title={!keystrokesMatch && chars > 0 ? 'Keystroke count must match character count' : !hasMinChars ? 'Minimum 60 characters required' : undefined}
          >
            {isLast ? (
              <>
                Review Answers
                <Check size={16} />
              </>
            ) : (
              <>
                Next Question
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
