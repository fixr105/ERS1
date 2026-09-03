'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { NoiseBackground } from '@/components/ui/noise-background';

interface NoiseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  containerClassName?: string;
}

export function NoiseButton({
  className,
  containerClassName,
  disabled,
  children,
  style,
  ...props
}: NoiseButtonProps) {
  const fullWidth =
    style?.width === '100%' ||
    (typeof style?.width === 'string' && style.width.includes('100%')) ||
    className?.includes('dropzone') ||
    className?.includes('select-trigger') ||
    className?.includes('employee-option');

  return (
    <NoiseBackground
      animating={!disabled}
      containerClassName={cn(
        'p-2 rounded-full',
        fullWidth ? 'w-full' : 'w-fit',
        disabled && 'opacity-60',
        containerClassName,
      )}
      className="w-full"
    >
      <button
        {...props}
        className={cn(className, 'noise-btn-inner')}
        disabled={disabled}
        style={{
          ...style,
          background: '#000',
          backgroundImage: 'none',
          border: 'none',
          boxShadow: 'none',
          color: style?.color || '#fff',
          ...(fullWidth ? { width: '100%' } : undefined),
        }}
      >
        {children}
      </button>
    </NoiseBackground>
  );
}
