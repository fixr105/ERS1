'use client';

import { useParams } from 'next/navigation';
import { Stage1Form } from '@/components/Stage1Form';
import { Stage2Upload } from '@/components/Stage2Upload';
import { Stage3Interview } from '@/components/Stage3Interview';
import { Stage4PeerFeedback } from '@/components/Stage4PeerFeedback';
import { Stage5Report } from '@/components/Stage5Report';

export default function StagePage() {
  const params = useParams<{ employeeId: string; stage: string }>();
  const employeeId = params.employeeId;
  const stage = parseInt(params.stage, 10);

  if (stage === 1) return <Stage1Form employeeId={employeeId} />;
  if (stage === 2) return <Stage2Upload employeeId={employeeId} />;
  if (stage === 3) return <Stage3Interview employeeId={employeeId} />;
  if (stage === 4) return <Stage4PeerFeedback employeeId={employeeId} />;
  if (stage === 5) return <Stage5Report employeeId={employeeId} />;

  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Stage not found.</p>
    </div>
  );
}
