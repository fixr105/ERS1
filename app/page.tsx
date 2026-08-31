'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { fetchEmployees } from '@/lib/webhooks';
import type { Employee } from '@/lib/types';
import { useReview } from '@/context/ReviewContext';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ width: '100%', maxWidth: 480 }} className="animate-fade-in-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>Seven </span>
            <span className="grad-text">Fincorp</span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              marginTop: 4,
              textTransform: 'uppercase',
            }}
          >
            Review System
          </div>
        </div>

        {/* Main card */}
        <div className="grad-border grad-border-animated" style={{ padding: 40 }}>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: '-0.02em',
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            Monthly Review
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>
            Select your name to begin this month&apos;s review.
          </p>

          {/* Month/Year */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Review Period
            </label>
            <div
              style={{
                padding: '12px 14px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                color: 'var(--text-secondary)',
                fontSize: 14,
              }}
            >
              {monthYear}
            </div>
          </div>

          {/* Employee dropdown */}
          <div style={{ marginBottom: 32, position: 'relative' }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Your Name
            </label>

            {loading ? (
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--text-muted)',
                  fontSize: 14,
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                Loading employees...
              </div>
            ) : error ? (
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  border: '1px solid #F8717140',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--danger)',
                  fontSize: 14,
                }}
              >
                <AlertCircle size={16} />
                Could not load employees.
                <button
                  onClick={loadEmployees}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-light)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'var(--bg-surface)',
                    border: `1px solid ${dropdownOpen ? 'var(--accent)' : 'var(--border-default)'}`,
                    borderRadius: 8,
                    color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: 14,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'border-color 0.2s',
                  }}
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
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-bright)',
                      borderRadius: 8,
                      maxHeight: 240,
                      overflowY: 'auto',
                      zIndex: 100,
                      boxShadow: '0 8px 32px #00000060',
                    }}
                  >
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelected(emp);
                          setDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--text-primary)',
                          fontSize: 14,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#6C63FF10')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
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

          {/* CTA */}
          <button
            className="btn-primary"
            onClick={handleBegin}
            disabled={!selected}
            style={{ width: '100%', justifyContent: 'center', padding: '14px 20px' }}
          >
            Begin Review
            <ArrowRight size={16} />
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 24 }}>
          Seven Fincorp · Confidential Employee Review System
        </p>
      </div>
    </div>
  );
}
