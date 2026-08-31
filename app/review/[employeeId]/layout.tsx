'use client';

import { ReactNode } from 'react';
import { ReviewTopBar } from '@/components/StageRail';

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <ReviewTopBar />
      <main
        style={{
          flex: 1,
          padding: '48px 48px',
          maxWidth: 900,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
        className="review-main"
      >
        {children}
      </main>
    </div>
  );
}
