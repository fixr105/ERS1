'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';
import { NoiseButton } from '@/components/ui/noise-button';

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div
      className="grad-border"
      style={{ padding: 24, borderColor: '#F8717130' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <AlertCircle size={24} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
            Something went wrong
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>{message}</p>
          {onRetry && (
            <NoiseButton className="btn-ghost" onClick={onRetry} style={{ padding: '8px 16px', fontSize: 13 }}>
              <RotateCcw size={14} />
              Try Again
            </NoiseButton>
          )}
        </div>
      </div>
    </div>
  );
}
