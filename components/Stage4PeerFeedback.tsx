'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Loader2, AlertTriangle, Send, Users } from 'lucide-react';
import { useReview } from '@/context/ReviewContext';
import { useToast } from '@/components/ToastProvider';
import { fetchEmployees, submitStage4 } from '@/lib/webhooks';
import type { Employee, PeerRating, Stage4Data } from '@/lib/types';
import { PEER_RATING_LABELS } from '@/lib/types';
import { LoadingSpinner } from '@/components/Loading';
import { ErrorCard } from '@/components/ErrorCard';

const RATING_KEYS = Object.keys(PEER_RATING_LABELS) as (keyof PeerRating['ratings'])[];

function createDefaultRating(colleagueId: string, colleagueName: string): PeerRating {
  return {
    colleagueId,
    colleagueName,
    ratings: {
      respondsOnTime: 5,
      helpsWithTasks: 5,
      helpsBeyondScope: 5,
      cooperativeEnvironment: 5,
      communicationQuality: 5,
      professionalEtiquette: 5,
      emailEtiquette: 5,
      whatsappEtiquette: 5,
    },
    interaction: true,
  };
}

export function Stage4PeerFeedback({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const { state, setStage4 } = useReview();
  const { toast } = useToast();

  const [loading, setLoading] = useState(!state.stage4);
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<Employee[]>([]);
  const [ratings, setRatings] = useState<PeerRating[]>(
    state.stage4?.peerFeedback || [],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const stageStartTime = useRef(Date.now());

  const fetchPeers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployees();
      const filtered = data.filter((e) => e.id !== employeeId);
      setPeers(filtered);
      setRatings(filtered.map((p) => createDefaultRating(p.id, p.name)));
      setExpanded(new Set([filtered[0]?.id]));
    } catch (err) {
      console.error('Webhook failed:', err);
      setError('Something went wrong. Please try again.');
      setPeers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state.stage4) return;
    fetchPeers();
  }, [employeeId, state.stage4]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateRating = (colleagueId: string, key: keyof PeerRating['ratings'], value: number) => {
    setRatings((prev) =>
      prev.map((r) =>
        r.colleagueId === colleagueId
          ? { ...r, ratings: { ...r.ratings, [key]: value } }
          : r,
      ),
    );
  };

  const toggleInteraction = (colleagueId: string) => {
    setRatings((prev) =>
      prev.map((r) =>
        r.colleagueId === colleagueId
          ? {
              ...r,
              interaction: !r.interaction,
              ratings: !r.interaction
                ? { respondsOnTime: 0, helpsWithTasks: 0, helpsBeyondScope: 0, cooperativeEnvironment: 0, communicationQuality: 0, professionalEtiquette: 0, emailEtiquette: 0, whatsappEtiquette: 0 }
                : { respondsOnTime: 5, helpsWithTasks: 5, helpsBeyondScope: 5, cooperativeEnvironment: 5, communicationQuality: 5, professionalEtiquette: 5, emailEtiquette: 5, whatsappEtiquette: 5 },
            }
          : r,
      ),
    );
  };

  const runBiasCheck = (): string[] => {
    const newWarnings: string[] = [];

    ratings.forEach((r) => {
      if (!r.interaction) return;
      const values = Object.values(r.ratings);
      const allLow = values.every((v) => v <= 2);
      if (allLow) {
        newWarnings.push(`You've rated ${r.colleagueName} very low across all dimensions. Confirm this is accurate.`);
      }
    });

    const interactingPeers = ratings.filter((r) => r.interaction);
    if (interactingPeers.length > 1) {
      const firstRatings = Object.values(interactingPeers[0].ratings).join(',');
      const allSame = interactingPeers.every((r) => Object.values(r.ratings).join(',') === firstRatings);
      if (allSame) {
        newWarnings.push('Your ratings look uniform. Please review for accuracy.');
      }
    }

    return newWarnings;
  };

  const handleSubmit = async () => {
    const newWarnings = runBiasCheck();
    if (newWarnings.length > 0 && !showWarnings) {
      setWarnings(newWarnings);
      setShowWarnings(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const timeSpentSeconds = Math.round((Date.now() - stageStartTime.current) / 1000);
      await submitStage4(
        employeeId,
        state.employeeName,
        state.sessionId,
        state.month,
        ratings,
        timeSpentSeconds,
        showWarnings,
      );
      const stage4Data: Stage4Data = { peerFeedback: ratings };
      setStage4(stage4Data);
      toast('Feedback submitted', 'success');
      router.push(`/review/${employeeId}/5`);
    } catch (err) {
      console.error('Webhook failed:', err);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 80 }}>
        <LoadingSpinner label="Loading your team..." />
      </div>
    );
  }

  if (error && peers.length === 0) {
    return <ErrorCard message={error} onRetry={fetchPeers} />;
  }

  // Empty state — no peers returned
  if (peers.length === 0 && !error) {
    return (
      <div className="empty-state">
        <Users size={32} color="var(--text-muted)" />
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          No colleagues found for this review period.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Contact your administrator if this seems incorrect.
        </p>
        <button className="btn-ghost" onClick={fetchPeers}>Retry</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h1
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: '-0.02em',
          marginBottom: 8,
        }}
      >
        Your Team
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 40 }}>
        Rate the colleagues you worked with this month. Be honest — responses are confidential.
      </p>

      {error && (
        <div className="error-card">
          <span>&#9888; {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Bias warnings */}
      {showWarnings && warnings.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {warnings.map((w, i) => (
            <div
              key={i}
              className="grad-border"
              style={{ padding: 16, borderColor: '#FBBF2440' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: 'var(--text-primary)', fontSize: 14 }}>{w}</p>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setShowWarnings(false)}>
              Review Ratings
            </button>
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Confirm &amp; Submit
            </button>
          </div>
        </div>
      )}

      {/* Peer cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {peers.map((peer) => {
          const rating = ratings.find((r) => r.colleagueId === peer.id);
          if (!rating) return null;
          const isExpanded = expanded.has(peer.id);

          return (
            <div key={peer.id} className="glow-card" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <button
                onClick={() => toggleExpand(peer.id)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--text-primary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{peer.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{peer.role} · {peer.department}</p>
                  </div>
                </div>
                {!rating.interaction && (
                  <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-bright)' }}>
                    No interaction
                  </span>
                )}
              </button>

              {/* Content */}
              {isExpanded && rating.interaction && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {RATING_KEYS.map((key) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {PEER_RATING_LABELS[key]}
                          </label>
                          <span
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              letterSpacing: '-0.03em',
                              color: 'var(--accent-light)',
                              minWidth: 32,
                              textAlign: 'right',
                            }}
                          >
                            {rating.ratings[key]}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={rating.ratings[key]}
                          onChange={(e) => updateRating(peer.id, key, parseInt(e.target.value, 10))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Low</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>High</span>
                        </div>
                      </div>
                    ))}

                    {/* No interaction checkbox */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        padding: '10px 14px',
                        background: 'var(--bg-surface)',
                        borderRadius: 8,
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!rating.interaction}
                        onChange={() => toggleInteraction(peer.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Did not interact this month
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Collapsed no-interaction state */}
              {isExpanded && !rating.interaction && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ paddingTop: 20 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        padding: '10px 14px',
                        background: 'var(--bg-surface)',
                        borderRadius: 8,
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!rating.interaction}
                        onChange={() => toggleInteraction(peer.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Did not interact this month — re-enable to rate
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleSubmit} disabled={submitting} style={{ padding: '14px 28px' }}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Submit Feedback
        </button>
      </div>
    </div>
  );
}
