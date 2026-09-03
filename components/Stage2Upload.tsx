'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, UploadCloud, FileText, X, Loader2,
  Check, Edit3, Sparkles,
} from 'lucide-react';
import { useReview } from '@/context/ReviewContext';
import { useToast } from '@/components/ToastProvider';
import {
  ingestStage2File, getStage2Summary, confirmStage2Summary,
  type Stage2FilePayload,
  type Stage2SummaryResponse,
} from '@/lib/webhooks';
import type { UploadedFile, Stage2Data } from '@/lib/types';
import { saveReviewProgress } from '@/lib/reviewProgress';
import { NoiseButton } from '@/components/ui/noise-button';
import { LoadingBar } from '@/components/Loading';
import { useKeyboardEnforcement } from '@/hooks/use-keyboard-enforcement';
import { KeyboardGateModal, KeystrokeCounter } from '@/components/KeyboardEnforcement';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const SLOT_COUNT = 5;

interface WorkSlot {
  priority: number;
  title: string;
  file: UploadedFile | null;
}

function emptySlots(existing?: UploadedFile[]): WorkSlot[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const priority = i + 1;
    const match = existing?.find((f) => f.priority === priority);
    return {
      priority,
      title: match?.title || '',
      file: match || null,
    };
  });
}

export function Stage2Upload({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const { state, setStage2 } = useReview();
  const { toast } = useToast();
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const rawFilesRef = useRef<Record<number, File>>({});
  const stageStartTime = useRef(Date.now());

  const [slots, setSlots] = useState<WorkSlot[]>(() => emptySlots(state.stage2?.files));
  const [uploadingPriority, setUploadingPriority] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [analysing, setAnalysing] = useState(false);
  const [summary, setSummary] = useState<Stage2SummaryResponse | null>(
    state.stage2?.summary
      ? {
          summary: state.stage2.summary,
          projectsIdentified: state.stage2.projectsIdentified,
          keyOutputs: state.stage2.keyOutputs,
          contributionLevel: state.stage2.contributionLevel as 'High' | 'Medium' | 'Low',
          notes: state.stage2.notes,
          contradictions: state.stage2.contradictions || [],
        }
      : null,
  );
  const [editMode, setEditMode] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showGate, dismissGate, recordKeystroke, keystrokes, getFieldMismatch } =
    useKeyboardEnforcement(['editedSummary']);

  const uploadedSlots = slots.filter((s) => s.file?.uploaded);
  const uploading = uploadingPriority != null;
  const canAnalyse = uploadedSlots.length > 0 && !uploading && !analysing;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validatePdf = (file: File): boolean => {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      toast('PDF only. Merge other files into one PDF for that work item.', 'error');
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast(`${file.name} exceeds the 20MB limit.`, 'error');
      return false;
    }
    return true;
  };

  const handleSlotFile = async (priority: number, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !validatePdf(file)) return;

    const slot = slots.find((s) => s.priority === priority);
    setUploadingPriority(priority);
    setError(null);
    setUploadProgress((p) => ({ ...p, [priority]: 12 }));

    try {
      await ingestStage2File({
        sessionId: state.sessionId,
        employeeId,
        file,
        priority,
        title: slot?.title || '',
      });
      rawFilesRef.current[priority] = file;
      setUploadProgress((p) => ({ ...p, [priority]: 100 }));
      setSlots((prev) =>
        prev.map((s) =>
          s.priority === priority
            ? {
                ...s,
                file: {
                  name: file.name,
                  size: file.size,
                  type: file.type || 'application/pdf',
                  uploaded: true,
                  priority,
                  title: s.title,
                },
              }
            : s,
        ),
      );
    } catch (err) {
      console.error('Ingest failed:', err);
      delete rawFilesRef.current[priority];
      toast(`Failed to send ${file.name} for parsing`, 'error');
    } finally {
      setUploadingPriority(null);
    }
  };

  const removeSlotFile = (priority: number) => {
    delete rawFilesRef.current[priority];
    setSlots((prev) => prev.map((s) => (s.priority === priority ? { ...s, file: null } : s)));
    setUploadProgress((p) => {
      const next = { ...p };
      delete next[priority];
      return next;
    });
  };

  const filesToPayload = async (): Promise<Stage2FilePayload[]> => {
    const filled = slots.filter((s) => s.file?.uploaded);
    return filled.map((slot) => ({
      name: slot.file!.name,
      type: slot.file!.type,
      size: slot.file!.size,
      priority: slot.priority,
      title: slot.title,
      parsedContent: '',
    }));
  };

  const handleAnalyse = async () => {
    setAnalysing(true);
    setError(null);
    try {
      const result = await getStage2Summary(
        employeeId,
        state.sessionId,
        state.stage1,
        await filesToPayload(),
      );
      setSummary(result);
      setEditedSummary(result.summary);
    } catch (err) {
      console.error('Webhook failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setAnalysing(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    const finalSummary = editMode ? editedSummary : summary?.summary || '';
    const edited = editMode;
    const files: UploadedFile[] = slots
      .filter((s) => s.file)
      .map((s) => ({ ...s.file!, title: s.title, priority: s.priority }));

    try {
      const timeSpentSeconds = Math.round((Date.now() - stageStartTime.current) / 1000);
      await confirmStage2Summary({
        employeeId,
        sessionId: state.sessionId,
        files: await filesToPayload(),
        summary: finalSummary,
        edited,
        projectsIdentified: summary?.projectsIdentified || [],
        keyOutputs: summary?.keyOutputs || [],
        contributionLevel: summary?.contributionLevel || 'Medium',
        aiObservations: summary?.notes || '',
        contradictions: summary?.contradictions || [],
        timeSpentSeconds,
      });
      const stage2Data: Stage2Data = {
        files,
        summary: finalSummary,
        summaryEdited: edited,
        projectsIdentified: summary?.projectsIdentified || [],
        keyOutputs: summary?.keyOutputs || [],
        contributionLevel: summary?.contributionLevel || '',
        notes: summary?.notes || '',
        contradictions: summary?.contradictions || [],
      };
      setStage2(stage2Data);
      saveReviewProgress(employeeId, state.month, state.year, state.sessionId, 2);
      toast('Work summary confirmed', 'success');
      router.push(`/review/${employeeId}/3`);
    } catch (err) {
      console.error('Webhook failed:', err);
      setError('Could not confirm work summary. Please try again.');
      toast('Could not confirm work summary. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (analysing) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          gap: 32,
        }}
      >
        <Sparkles size={48} className="grad-text" />
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 500, textAlign: 'center', marginBottom: 8 }}>
            Analysing your work...
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 14 }}>
            This takes 20–30 seconds.
          </p>
        </div>
        <LoadingBar />
      </div>
    );
  }

  if (showGate && editMode) {
    return (
      <KeyboardGateModal
        title="Keyboard-Only Edit Mode"
        description="When editing your work summary, keyboard-only mode applies. Paste and right-click are disabled. If you edit the AI-generated summary, you must type your changes manually."
        onConfirm={dismissGate}
      />
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h1
        style={{
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: '-0.02em',
          marginBottom: 8,
        }}
      >
        Show your work.
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 12 }}>
        PDF only. Rank up to five work items (1 is highest priority). One PDF per item — merge related
        files into a single PDF if you need more context.
      </p>

      {error && (
        <div className="error-card">
          <span>&#9888; {error}</span>
          <NoiseButton onClick={() => setError(null)}>Dismiss</NoiseButton>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {slots.map((slot) => (
          <div key={slot.priority} className="glow-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span className="badge badge-accent">Priority {slot.priority}</span>
              <input
                className="input-field"
                value={slot.title}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((s) => (s.priority === slot.priority ? { ...s, title: e.target.value } : s)),
                  )
                }
                placeholder="Workstream name (optional)"
                style={{ flex: 1, minHeight: 40 }}
              />
            </div>

            {slot.file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={20} color="var(--accent-light)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {slot.file.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatSize(slot.file.size)}</p>
                  {uploadProgress[slot.priority] !== undefined && uploadingPriority === slot.priority && (
                    <div className="score-bar-wrap" style={{ height: 3, marginTop: 6 }}>
                      <div className="score-bar-fill" style={{ width: `${uploadProgress[slot.priority]}%` }} />
                    </div>
                  )}
                </div>
                {slot.file.uploaded && <Check size={16} color="var(--success)" />}
                <NoiseButton
                  type="button"
                  onClick={() => removeSlotFile(slot.priority)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                >
                  <X size={16} />
                </NoiseButton>
              </div>
            ) : (
              <NoiseButton
                type="button"
                className="dropzone"
                disabled={uploading}
                onClick={() => fileInputRefs.current[slot.priority]?.click()}
                style={{
                  width: '100%',
                  minHeight: 88,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                }}
              >
                <UploadCloud size={22} color="var(--text-muted)" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Attach one PDF</span>
              </NoiseButton>
            )}
            <input
              ref={(el) => {
                fileInputRefs.current[slot.priority] = el;
              }}
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                handleSlotFile(slot.priority, e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        ))}
      </div>

      {!summary && (
        <div className="stage2-actions">
          <div className="stage2-progress">
            <p>
              {uploading
                ? 'Uploading PDF…'
                : uploadedSlots.length > 0
                  ? `${uploadedSlots.length} of ${SLOT_COUNT} work PDFs uploaded`
                  : 'Attach at least one PDF to continue'}
            </p>
          </div>
          <NoiseButton
            type="button"
            className="btn-primary"
            onClick={handleAnalyse}
            disabled={!canAnalyse}
            title={!canAnalyse ? 'Upload at least one PDF to continue' : undefined}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                Analyse My Work
                <ArrowRight size={16} />
              </>
            )}
          </NoiseButton>
        </div>
      )}

      {summary && (
        <div className="grad-border grad-border-animated" style={{ padding: 28, marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Sparkles size={18} className="grad-text" />
            <h3 style={{ fontSize: 18, fontWeight: 500 }}>
              AI Work Summary
            </h3>
          </div>

          <div style={{ borderTop: '1px solid var(--border-default)', marginBottom: 20 }} />

          {editMode ? (
            <div style={{ position: 'relative' }}>
              <textarea
                className="input-field"
                value={editedSummary}
                data-keyboard-only="true"
                onPaste={(e) => { e.preventDefault(); toast('Paste is disabled — keyboard input only', 'error'); }}
                onContextMenu={(e) => e.preventDefault()}
                onKeyPress={() => recordKeystroke('editedSummary')}
                onChange={(e) => setEditedSummary(e.target.value)}
                rows={8}
                style={{ minHeight: 160 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, gap: 16 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {editedSummary.length} chars
                </span>
                <KeystrokeCounter
                  keystrokes={keystrokes['editedSummary'] || 0}
                  chars={editedSummary.length}
                  mismatch={getFieldMismatch('editedSummary', editedSummary)}
                />
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Projects identified
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {summary.projectsIdentified.map((p, i) => (
                    <span key={i} className="badge badge-accent">{p}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Key outputs
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {summary.keyOutputs.map((o, i) => (
                    <span key={i} className="badge badge-gold">{o}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Estimated contribution level
                </p>
                <span className={`badge ${summary.contributionLevel === 'High' ? 'badge-success' : 'badge-accent'}`}>
                  {summary.contributionLevel}
                </span>
              </div>

              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Notes
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{summary.notes}</p>
              </div>

              {summary.contradictions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--warning)', marginBottom: 6 }}>
                    Perception vs evidence
                  </p>
                  <ul style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, paddingLeft: 18 }}>
                    {summary.contradictions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Summary
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{summary.summary}</p>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <NoiseButton className="btn-ghost" onClick={() => setEditMode((e) => !e)}>
              <Edit3 size={14} />
              {editMode ? 'Preview' : 'Edit Summary'}
            </NoiseButton>
            <NoiseButton
              className="btn-primary"
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Confirm &amp; Continue
              <ArrowRight size={16} />
            </NoiseButton>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>
              Are you sure you want to submit this summary?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Errors here affect your final assessment.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <NoiseButton className="btn-ghost" onClick={() => setShowConfirm(false)}>Go Back</NoiseButton>
              <NoiseButton className="btn-primary" onClick={handleConfirm} disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Yes, Submit
              </NoiseButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
