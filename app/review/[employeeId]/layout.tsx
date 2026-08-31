'use client';

import { ReactNode } from 'react';
import { ReviewTopBar } from '@/components/StageRail';
import { SessionGuard } from '@/components/SessionGuard';

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <ReviewTopBar />
      <main className="review-main">
        <SessionGuard>{children}</SessionGuard>
      </main>
    </div>
  );
}
