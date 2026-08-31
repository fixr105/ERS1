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
import { LoadingBar } from '@/components/Loading';
import { useKeyboardEnforcement } from '@/hooks/use-keyboard-enforcement';
import { KeyboardGateModal, KeystrokeCounter } from '@/components/KeyboardEnforcement';

const ACCEPTED_TYPES = '.pdf,.docx,.xlsx,.png,.jpg,.pptx';
const MAX_FILES = 20;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
];

export function Stage2Upload({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const { state, setStage2 } = useReview();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawFilesRef = useRef<File[]>([]);
  const stageStartTime = useRef(Date.now());

  const [files, setFiles] = useState<UploadedFile[]>(state.stage2?.files || []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
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
  const [dragOver, setDragOver] = useState(false);

  const { showGate, dismissGate, recordKeystroke, keystrokes, getFieldMismatch } =
    useKeyboardEnforcement(['editedSummary']);

  const uploadedCount = files.filter((f) => f.uploaded).length;
  const overallUploadPercent =
    files.length === 0
      ? 0
      : Math.round(
          files.reduce((sum, f) => sum + (f.uploaded ? 100 : uploadProgress[f.name] || 0), 0) /
            files.length,
        );
  const canAnalyse = uploadedCount > 0 && !uploading && !analysing;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast(`${file.name} is not a supported file type.`, 'error');
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast(`${file.name} exceeds the 20MB limit.`, 'error');
      return false;
    }
    return true;
  };

  const handleFiles = async (fileList: FileList) => {
    const allFiles = Array.from(fileList);

    const validFiles: File[] = [];
    for (const file of allFiles) {
      if (files.length + validFiles.length >= MAX_FILES) {
        toast('Maximum 20 files allowed.', 'error');
        break;
      }
      if (validateFile(file)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    setError(null);

    rawFilesRef.current = [...rawFilesRef.current, ...validFiles];
    const fileEntries: UploadedFile[] = validFiles.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      uploaded: false,
    }));

    setFiles((prev) => [...prev, ...fileEntries]);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress((p) => ({ ...p, [file.name]: 12 }));
      try {
        await ingestStage2File({
          sessionId: state.sessionId,
          employeeId,
          file,
        });
        setUploadProgress((p) => ({ ...p, [file.name]: 100 }));
        setFiles((prev) =>
          prev.map((f) => (f.name === file.name ? { ...f, uploaded: true } : f)),
        );
      } catch (err) {
        console.error('Ingest failed:', err);
        setFiles((prev) => prev.filter((f) => f.name !== file.name));
        rawFilesRef.current = rawFilesRef.current.filter((f) => f.name !== file.name);
        toast(`Failed to send ${file.name} for parsing`, 'error');
      }
    }

    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (name: string) => {
    rawFilesRef.current = rawFilesRef.current.filter((f) => f.name !== name);
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const filesToPayload = async (): Promise<Stage2FilePayload[]> => {
    const source = rawFilesRef.current.length
      ? rawFilesRef.current
      : files.map((f) => new File([], f.name, { type: f.type }));

    return Promise.all(
      source.map(async (file) => {
        const readable =
          file.type.startsWith('text/') ||
          /\.(txt|csv|json|md)$/i.test(file.name);
        let parsedContent = '';
        if (readable && file.size > 0) {
          parsedContent = (await file.text()).slice(0, 4000);
        }
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          parsedContent,
        };
      }),
    );
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
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 20 }}>
        Upload everything you produced this month. Documents, reports, spreadsheets, presentations.
      </p>

      {error && (
        <div className="error-card">
          <span>&#9888; {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Upload zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`dropzone${dragOver ? ' is-over' : ''}`}
        style={{
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          gap: 12,
        }}
      >
        <UploadCloud size={40} color="var(--text-muted)" />
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>
          Drop files here or click to browse
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          PDF, DOCX, XLSX, PNG, JPG, PPTX · Max {MAX_FILES} files · 20MB each
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((file) => (
            <div
              key={file.name}
              className="glow-card"
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <FileText size={20} color="var(--accent-light)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatSize(file.size)}</p>
                {uploadProgress[file.name] !== undefined && (
                  <div className="score-bar-wrap" style={{ height: 3, marginTop: 6 }}>
                    <div className="score-bar-fill" style={{ width: `${uploadProgress[file.name]}%` }} />
                  </div>
                )}
              </div>
              {file.uploaded && <Check size={16} color="var(--success)" />}
              {!uploading && (
                <button
                  onClick={() => removeFile(file.name)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 4,
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!summary && (
        <div className="stage2-actions">
          <div className="stage2-progress">
            <div className="score-bar-wrap" style={{ height: 8 }}>
              <div className="score-bar-fill" style={{ width: `${overallUploadPercent}%` }} />
            </div>
            <p>
              {uploading
                ? `Uploading ${uploadedCount} of ${files.length} file${files.length === 1 ? '' : 's'}…`
                : uploadedCount > 0
                  ? `${uploadedCount} file${uploadedCount === 1 ? '' : 's'} uploaded`
                  : 'Upload a file to enable continue'}
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleAnalyse}
            disabled={!canAnalyse}
            title={!canAnalyse ? 'Upload at least one file to continue' : undefined}
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
          </button>
        </div>
      )}

      {/* Summary card */}
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
            <button className="btn-ghost" onClick={() => setEditMode((e) => !e)}>
              <Edit3 size={14} />
              {editMode ? 'Preview' : 'Edit Summary'}
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Confirm &amp; Continue
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
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
              <button className="btn-ghost" onClick={() => setShowConfirm(false)}>Go Back</button>
              <button className="btn-primary" onClick={handleConfirm} disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
