'use client';

interface LoadingSpinnerProps {
  size?: number;
  label?: string;
}

export function LoadingSpinner({ size = 40, label }: LoadingSpinnerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
      <div className="spinner" style={{ width: size, height: size }} />
      {label && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{label}</p>}
    </div>
  );
}

interface LoadingBarProps {
  steps?: string[];
  intervalMs?: number;
}

import { useEffect, useState } from 'react';

export function LoadingBar({ steps, intervalMs = 2500 }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const progInterval = setInterval(() => {
      setProgress((p) => (p >= 95 ? 95 : p + Math.random() * 8));
    }, 400);
    return () => clearInterval(progInterval);
  }, []);

  useEffect(() => {
    if (!steps || steps.length === 0) return;
    const stepInterval = setInterval(() => {
      setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, intervalMs);
    return () => clearInterval(stepInterval);
  }, [steps, intervalMs]);

  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      {steps && steps.length > 0 && (
        <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 500, marginBottom: 24, minHeight: 24 }}>
          {steps[stepIndex]}
        </p>
      )}
      <div className="score-bar-wrap" style={{ height: 4 }}>
        <div className="score-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
