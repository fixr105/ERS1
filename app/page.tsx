'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { fetchEmployees } from '@/lib/webhooks';
import type { Employee } from '@/lib/types';
import { useReview } from '@/context/ReviewContext';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { ReviewPipeline } from '@/components/ReviewPipeline';

export default function EntryPage() {
  const router = useRouter();
  const { setEmployee } = useReview();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Webhook failed:', err);
      setError('Could not load employees. Please try again.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const now = new Date();
  const monthYear = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`;

  const handleBegin = () => {
    if (!selected) return;
    setEmployee(selected.id, selected.name, selected.department, selected.role);
    router.push(`/review/${selected.id}/1`);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <SiteNav />
      <div className="page-container">
        <section className="hero-layout animate-fade-in-up">
          <div>
            <p className="eyebrow">Monthly performance infrastructure</p>
            <h1 className="hero-title" style={{ margin: '20px 0 24px' }}>
              Your month, scored as a <span className="accent-text">five-stage system</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 19, lineHeight: 1.55, maxWidth: 640, marginBottom: 28 }}>
              Select your name to begin this month&apos;s review. Self-assessment, evidence, interview,
              peer feedback, and a compiled report — one confidential session.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#start" className="btn-primary">
                Start this month
                <ArrowRight size={16} className="arrow" />
              </a>
              <a href="#pipeline" className="btn-ghost">
                See the pipeline
              </a>
            </div>
          </div>

          <div id="start" className="grad-border start-panel">
            <h2 className="heading-display" style={{ fontSize: 22, marginBottom: 8 }}>
              Monthly Review
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28 }}>
              Select your name to begin this month&apos;s review.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label className="field-label">Review Period</label>
              <div className="select-trigger" style={{ cursor: 'default', color: 'var(--text-secondary)' }}>
                {monthYear}
              </div>
            </div>

            <div style={{ marginBottom: 24, position: 'relative' }}>
              <label className="field-label">Your Name</label>

              {loading ? (
                <div className="select-trigger" style={{ color: 'var(--text-muted)', gap: 10 }}>
                  <Loader2 size={16} className="animate-spin" />
                  Loading employees...
                </div>
              ) : error ? (
                <div
                  className="select-trigger"
                  style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--danger)', gap: 10 }}
                >
                  <AlertCircle size={16} />
                  Could not load employees.
                  <button onClick={loadEmployees} className="btn-text" style={{ marginLeft: 'auto' }}>
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className={`select-trigger${dropdownOpen ? ' is-open' : ''}`}
                    style={{ color: selected ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {selected ? (
                      <span>
                        {selected.name}
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>
                          · {selected.department}
                        </span>
                      </span>
                    ) : (
                      'Select your name...'
                    )}
                    <ChevronRight
                      size={16}
                      style={{
                        transform: dropdownOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s',
                        color: 'var(--text-muted)',
                      }}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="employee-menu">
                      {employees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="employee-option"
                          onClick={() => {
                            setSelected(emp);
                            setDropdownOpen(false);
                          }}
                        >
                          <span>{emp.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{emp.department}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              className="btn-primary"
              onClick={handleBegin}
              disabled={!selected}
              style={{ width: '100%' }}
            >
              Begin Review
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <ReviewPipeline />

        <div className="home-metrics" id="stages">
          <div>
            <p className="metric-num">5</p>
            <p style={{ color: 'var(--text-muted)', marginTop: 10, fontSize: 14 }}>
              Sequential stages, one Airtable session
            </p>
          </div>
          <div>
            <p className="metric-num">10</p>
            <p style={{ color: 'var(--text-muted)', marginTop: 10, fontSize: 14 }}>
              Interview questions from your evidence
            </p>
          </div>
          <div>
            <p className="metric-num">0</p>
            <p style={{ color: 'var(--text-muted)', marginTop: 10, fontSize: 14 }}>
              Paste allowed on assessment fields
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
