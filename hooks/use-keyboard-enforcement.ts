'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 7px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-bright)',
  borderRadius: 4,
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--accent-light)',
  margin: '0 2px',
};

export { kbdStyle };

/**
 * Hook that enforces keyboard-only input on a set of text fields.
 * Tracks keystrokes per field, blocks paste globally, and provides
 * validation helpers so submission is only allowed when keystrokes
 * match character counts.
 */
export function useKeyboardEnforcement(fieldKeys: string[]) {
  const { toast } = useToast();
  const [keystrokes, setKeystrokes] = useState<Record<string, number>>({});
  const [showGate, setShowGate] = useState(true);
  const fieldKeysRef = useRef(fieldKeys);
  fieldKeysRef.current = fieldKeys;

  // Block Ctrl+V / Cmd+V globally while any keyboard-only field is focused
  useEffect(() => {
    const blockPaste = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'v' &&
        document.activeElement?.getAttribute('data-keyboard-only') === 'true'
      ) {
        e.preventDefault();
        toast('Paste is disabled — keyboard input only', 'error');
      }
    };
    document.addEventListener('keydown', blockPaste);
    return () => document.removeEventListener('keydown', blockPaste);
  }, [toast]);

  const recordKeystroke = useCallback((key: string) => {
    setKeystrokes((k) => ({ ...k, [key]: (k[key] || 0) + 1 }));
  }, []);

  const isFieldValid = useCallback(
    (key: string, text: string, minChars: number) => {
      const chars = text.length;
      const keys = keystrokes[key] || 0;
      return chars >= minChars && keys >= chars;
    },
    [keystrokes],
  );

  const getFieldMismatch = useCallback(
    (key: string, text: string) => {
      const chars = text.length;
      const keys = keystrokes[key] || 0;
      return chars > 0 && keys < chars;
    },
    [keystrokes],
  );

  const getMismatchCount = useCallback(
    (fields: { key: string; text: string }[]) =>
      fields.filter((f) => getFieldMismatch(f.key, f.text)).length,
    [getFieldMismatch],
  );

  return {
    keystrokes,
    showGate,
    dismissGate: () => setShowGate(false),
    recordKeystroke,
    isFieldValid,
    getFieldMismatch,
    getMismatchCount,
  };
}
