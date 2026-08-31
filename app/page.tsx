'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { fetchEmployees } from '@/lib/webhooks';
import type { Employee } from '@/lib/types';
import { useReview } from '@/context/ReviewContext';

const STAGES = [
  'Self Assessment',
  'Work Evidence',
  'AI Interview',
  'Peer Feedback',
  'Final Report',
];

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
    <div className="app-home">
      <header className="app-home-bar">
        <span className="brand-mark">Seven Fincorp</span>
        <span className="app-home-bar-meta">Monthly Review · Internal</span>
      </header>

      <main className="app-home-main">
        <div className="app-home-panel">
          <div className="app-home-panel-head">
            <h1>Open a review session</h1>
            <p>Choose your name. You will go through five stages in order.</p>
          </div>

          <div className="app-home-grid">
            <div>
              <label className="field-label">Period</label>
              <div className="select-trigger" style={{ cursor: 'default', color: 'var(--text-secondary)' }}>
                {monthYear}
              </div>

              <label className="field-label" style={{ marginTop: 16 }}>
                Employee
              </label>
              <div style={{ position: 'relative' }}>
                {loading ? (
                  <div className="select-trigger" style={{ color: 'var(--text-muted)', gap: 10 }}>
                    <Loader2 size={16} className="animate-spin" />
                    Loading directory…
                  </div>
                ) : error ? (
                  <div
                    className="select-trigger"
                    style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'var(--danger)', gap: 10 }}
                  >
                    <AlertCircle size={16} />
                    Could not load employees.
                    <button type="button" onClick={loadEmployees} className="btn-text" style={{ marginLeft: 'auto' }}>
                      Retry
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
                            {selected.role} · {selected.department}
                          </span>
                        </span>
                      ) : (
                        'Select employee'
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
                type="button"
                className="btn-primary"
                onClick={handleBegin}
                disabled={!selected}
                style={{ width: '100%', marginTop: 20 }}
              >
                Continue to stage 1
                <ArrowRight size={16} />
              </button>
            </div>

            <ol className="app-home-stages">
              {STAGES.map((name, i) => (
                <li key={name}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {name}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
