'use client';

import { ReactNode } from 'react';
import { ReviewTopBar } from '@/components/StageRail';

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <ReviewTopBar />
      <main className="review-main">{children}</main>
    </div>
  );
}
