'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Copy, FileText, Sparkles, Loader2 } from 'lucide-react';
import { useReview } from '@/context/ReviewContext';
import { useToast } from '@/components/ToastProvider';
import { generateReport, isAirtableRecordId, type Stage5ReportResponse } from '@/lib/webhooks';
import type { Stage5Data } from '@/lib/types';
import { ErrorCard } from '@/components/ErrorCard';

const LOADING_STEPS: { label: string; duration: number | null }[] = [
  { label: 'Reviewing your self-assessment...', duration: 3000 },
  { label: 'Analysing work evidence...', duration: 4000 },
  { label: 'Processing interview responses...', duration: 4000 },
  { label: 'Incorporating peer feedback...', duration: 3000 },
  { label: 'Compiling final report...', duration: null },
];

export function Stage5Report({ employeeId }: { employeeId: string }) {
  const { state, setStage5 } = useReview();
  const { toast } = useToast();
  const [loading, setLoading] = useState(!state.stage5);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Stage5ReportResponse | null>(
    state.stage5
      ? {
          overallScore: state.stage5.overallScore,
          dimensions: state.stage5.dimensions,
          majorAchievements: state.stage5.majorAchievements,
          keyGaps: state.stage5.keyGaps,
          developmentPriorities: state.stage5.developmentPriorities,
          peerFeedbackSummary: state.stage5.peerFeedbackSummary,
          aiObservations: state.stage5.aiObservations,
        }
      : null,
  );
  const [downloading, setDownloading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);
  const stageStartTime = useRef(Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;

  const hasIncompleteStages = !state.stage1 || !state.stage2 || !state.stage3 || !state.stage4;

  // Loading step progression
  useEffect(() => {
    if (!loading) return;

    let stepIdx = 0;
    let progress = 0;
    let cancelled = false;

    const advanceStep = () => {
      if (cancelled) return;
      if (stepIdx >= LOADING_STEPS.length - 1) {
        setLoadingStep(LOADING_STEPS.length - 1);
        setLoadingProgress(90);
        return;
      }
      setLoadingStep(stepIdx);
      const step = LOADING_STEPS[stepIdx];
      if (step.duration !== null) {
        const progressForStep = ((stepIdx + 1) / LOADING_STEPS.length) * 100;
        const interval = setInterval(() => {
          if (cancelled) { clearInterval(interval); return; }
          progress += (progressForStep - progress) * 0.15;
          setLoadingProgress(Math.min(progress, progressForStep - 2));
        }, 200);
        setTimeout(() => {
          clearInterval(interval);
          stepIdx++;
          advanceStep();
        }, step.duration);
      } else {
        setLoadingProgress(90);
      }
    };

    advanceStep();

    const slowTimer = setTimeout(() => {
      if (!cancelled) setShowSlowWarning(true);
    }, 90000);

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [loading]);

  // Fetch report. generateReport dedupes in-flight calls so Strict Mode remounts share one n8n run.
  useEffect(() => {
    if (state.stage5) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const latest = stateRef.current;
        if (
          !isAirtableRecordId(latest.sessionId) ||
          !latest.stage1 ||
          !latest.stage2 ||
          !latest.stage3 ||
          !latest.stage4
        ) {
          throw new Error('Complete stages 1–4 in this session before generating a report.');
        }
        const timeSpentSeconds = Math.round((Date.now() - stageStartTime.current) / 1000);
        const res = await generateReport(employeeId, latest.sessionId, latest, timeSpentSeconds);
        setReport(res);
        setLoadingProgress(100);
        const stage5Data: Stage5Data = {
          overallScore: res.overallScore,
          dimensions: res.dimensions,
          majorAchievements: res.majorAchievements,
          keyGaps: res.keyGaps,
          developmentPriorities: res.developmentPriorities,
          peerFeedbackSummary: res.peerFeedbackSummary,
          aiObservations: res.aiObservations,
        };
        setStage5(stage5Data);
        setLoading(false);
      } catch (err) {
        console.error('Webhook failed:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not generate the report. Please try again.');
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [employeeId, retryKey, state.stage5, setStage5]);

  const handleDownloadPDF = async () => {
    const reportEl = document.getElementById('report-content');
    if (!reportEl) return;

    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportEl, {
        backgroundColor: '#07070D',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      if (pdfHeight <= pdf.internal.pageSize.getHeight()) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        let remainingHeight = pdfHeight;
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();
        while (remainingHeight > 0) {
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          remainingHeight -= pageHeight;
          if (remainingHeight > 0) {
            pdf.addPage();
            position -= pageHeight;
          }
        }
      }

      pdf.save(`Seven-Fincorp-Review-${state.employeeName}-${state.month}-${state.year}.pdf`);
      toast('PDF downloaded', 'success');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast('Could not generate PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!report) return;

    const md = report.fullReportMarkdown || `# Monthly Performance Report

**${state.employeeName} · ${state.month} ${state.year}**

## Overall Score: ${report.overallScore}/100

## Performance Dimensions
${report.dimensions.map((d) => `- **${d.name}**: ${d.score}/10`).join('\n')}

## Major Achievements
${report.majorAchievements}

## Key Gaps
${report.keyGaps}

## Development Priorities
${report.developmentPriorities}

## Peer Feedback Summary
${report.peerFeedbackSummary}

## AI Observations
${report.aiObservations}

---
*Generated by Seven Fincorp Review System*`;

    navigator.clipboard.writeText(md).then(() => {
      toast('Copied to clipboard', 'success');
    }).catch(() => {
      toast('Could not copy to clipboard', 'error');
    });
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 500,
          gap: 32,
        }}
      >
        <Sparkles size={48} className="grad-text" />
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 500, textAlign: 'center', marginBottom: 8 }}>
            Generating your assessment...
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 14 }}>
            {showSlowWarning ? 'This is taking longer than expected. Please wait...' : 'This may take up to 60 seconds.'}
          </p>
        </div>
        <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 500, marginBottom: 24, minHeight: 24 }}>
            {LOADING_STEPS[loadingStep]?.label}
          </p>
          <div className="score-bar-wrap" style={{ height: 4 }}>
            <div className="score-bar-fill" style={{ width: `${loadingProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorCard message={error} onRetry={() => {
      setError(null);
      setLoadingProgress(0);
      setLoadingStep(0);
      setShowSlowWarning(false);
      setRetryKey((k) => k + 1);
    }} />;
  }

  if (!report) return null;

  return (
    <div className="animate-fade-in-up">
      <div ref={reportRef}>
        {hasIncompleteStages && (
          <div className="dev-warning">
            Earlier stages are incomplete. This report used only the data available in this session.
          </div>
        )}

        <h1
          style={{
            fontWeight: 500,
            fontSize: 28,
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          Your Monthly Assessment
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 40 }}>
          Generated from your self-assessment, work evidence, interview, and peer feedback.
        </p>

        {/* Report card */}
        <div id="report-content" className="grad-border grad-border-animated" style={{ padding: 36 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Monthly Performance Report
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 500 }}>
              {state.employeeName} · {state.month} {state.year}
            </h2>
          </div>

          <div style={{ borderTop: '1px solid var(--border-default)', marginBottom: 32 }} />

          {/* Overall score */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Overall Score
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: 64,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
                className="grad-text"
              >
                {report.overallScore}
              </span>
              <span style={{ fontSize: 24, color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
            </div>
            <div className="score-bar-wrap" style={{ maxWidth: 400, margin: '0 auto', height: 8 }}>
              <div className="score-bar-fill" style={{ width: `${report.overallScore}%` }} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-default)', marginBottom: 32 }} />

          {/* Dimensions */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 20 }}>
              Performance Dimensions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {report.dimensions.map((dim, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{dim.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--accent-light)' }}>
                      {dim.score.toFixed(1)}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/10</span>
                    </span>
                  </div>
                  <div className="score-bar-wrap">
                    <div className="score-bar-fill" style={{ width: `${(dim.score / 10) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-default)', marginBottom: 32 }} />

          {/* Text sections */}
          {[
            { label: 'Major Achievements', content: report.majorAchievements },
            { label: 'Key Gaps', content: report.keyGaps },
            { label: 'Development Priorities', content: report.developmentPriorities },
            { label: 'Peer Feedback Summary', content: report.peerFeedbackSummary },
            { label: 'AI Observations', content: report.aiObservations },
          ].map((section, i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                {section.label}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>{section.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn-ghost" onClick={handleDownloadPDF} disabled={downloading}>
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download size={16} />
              Download PDF
            </>
          )}
        </button>
        <button className="btn-primary" onClick={handleCopyMarkdown}>
          <Copy size={16} />
          Copy as Markdown
        </button>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <FileText size={12} />
        Download a printable PDF of your assessment
      </p>
    </div>
  );
}
