'use client';

import { ReviewProvider } from '@/context/ReviewContext';
import { ToastProvider } from '@/components/ToastProvider';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ReviewProvider>
      <ToastProvider>{children}</ToastProvider>
    </ReviewProvider>
  );
}
