'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NoiseButton } from '@/components/ui/noise-button';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const MAX_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((t) => t.map((item) => (item.id === id ? { ...item, exiting: true } : item)));
    setTimeout(() => {
      setToasts((t) => t.filter((item) => item.id !== id));
    }, 200);
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => {
      const newToast: ToastItem = { id, message, type, exiting: false };
      const updated = [...t, newToast];
      if (updated.length > MAX_TOASTS) {
        return updated.slice(updated.length - MAX_TOASTS);
      }
      return updated;
    });
    setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.exiting ? 'exiting' : ''}`}
            style={{
              borderColor:
                t.type === 'success' ? '#34D39940'
                : t.type === 'error' ? '#F8717140'
                : 'rgba(234,75,113,0.35)',
            }}
          >
            <span
              style={{
                fontSize: 16,
                color:
                  t.type === 'success' ? 'var(--success)'
                  : t.type === 'error' ? 'var(--danger)'
                  : 'var(--accent-light)',
              }}
            >
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: 13, flex: 1 }}>{t.message}</span>
            <NoiseButton
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
                marginLeft: 8,
              }}
              aria-label="Close toast"
            >
              ×
            </NoiseButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
