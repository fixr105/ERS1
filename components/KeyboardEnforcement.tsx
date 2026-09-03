'use client';

import { Keyboard, AlertTriangle, Check } from 'lucide-react';
import { kbdStyle } from '@/hooks/use-keyboard-enforcement';
import { NoiseButton } from '@/components/ui/noise-button';

function RuleItem({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{text}</span>
    </div>
  );
}

export function KeyboardGateModal({
  title,
  description,
  onConfirm,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 500,
      }}
    >
      <div
        className="grad-border active"
        style={{
          padding: 40,
          maxWidth: 560,
          width: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#F8717115',
            border: '2px solid #F8717140',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Keyboard size={32} color="var(--danger)" />
        </div>

        <h1
          style={{
            fontWeight: 500,
            fontSize: 24,
            letterSpacing: '-0.02em',
            marginBottom: 16,
          }}
        >
          {title}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
          {description}
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            width: '100%',
            marginBottom: 32,
            textAlign: 'left',
          }}
        >
          <RuleItem
            icon={<Keyboard size={18} color="var(--accent-light)" />}
            text={
              <>
                Use <kbd style={kbdStyle}>Tab</kbd> to move forward and{' '}
                <kbd style={kbdStyle}>Shift+Tab</kbd> to move backward between answer boxes and buttons.
              </>
            }
          />
          <RuleItem
            icon={<AlertTriangle size={18} color="var(--danger)" />}
            text={
              <>
                Paste is <strong style={{ color: 'var(--danger)' }}>completely disabled</strong>. You
                cannot paste text using <kbd style={kbdStyle}>Ctrl+V</kbd>,{' '}
                <kbd style={kbdStyle}>Cmd+V</kbd>, right-click, or any other method.
              </>
            }
          />
          <RuleItem
            icon={<AlertTriangle size={18} color="var(--danger)" />}
            text={
              <>
                Right-click and context menus are blocked. All answers must be{' '}
                <strong style={{ color: 'var(--text-primary)' }}>typed manually</strong>.
              </>
            }
          />
          <RuleItem
            icon={<Keyboard size={18} color="var(--accent-light)" />}
            text={
              <>
                A keystroke counter tracks every key you press — it must match your character count to
                proceed.
              </>
            }
          />
        </div>

        <NoiseButton
          className="btn-primary"
          onClick={onConfirm}
          style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
        >
          <Check size={18} />
          I Understand — Start
        </NoiseButton>
      </div>
    </div>
  );
}

export function KeyboardStatusBar() {
  return (
    <div
      style={{
        background: '#F8717108',
        border: '1px solid #F8717125',
        borderRadius: 8,
        padding: '10px 16px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <Keyboard size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>Keyboard-only mode</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>|</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        <kbd style={kbdStyle}>Tab</kbd> to navigate
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>|</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        <kbd style={kbdStyle}>Ctrl+V</kbd> blocked
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>|</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Right-click blocked</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>|</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Type answers manually</span>
    </div>
  );
}

export function KeystrokeCounter({
  keystrokes,
  chars,
  mismatch,
}: {
  keystrokes: number;
  chars: number;
  mismatch: boolean;
}) {
  return (
    <span
      style={{
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: mismatch ? 'var(--danger)' : 'var(--success)',
      }}
    >
      <Keyboard size={13} />
      {keystrokes} keystrokes
      {mismatch && (
        <span style={{ fontSize: 11, color: 'var(--danger)' }}>— mismatch detected</span>
      )}
    </span>
  );
}
