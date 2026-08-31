const NODES = [
  { id: '01', title: 'Self Assessment', body: 'Typed narrative and a 1–10 self rating.' },
  { id: '02', title: 'Work Evidence', body: 'Upload artefacts. AI summarises against Stage 1.' },
  { id: '03', title: 'AI Interview', body: 'Ten questions generated from your evidence.' },
  { id: '04', title: 'Peer Feedback', body: 'Rate colleagues you actually worked with.' },
  { id: '05', title: 'Final Report', body: 'Scored dimensions and a written assessment.' },
];

export function ReviewPipeline() {
  return (
    <div className="product-frame grid-bg" id="pipeline">
      <div className="product-frame-bar">
        <span className="product-frame-dot" />
        <span className="product-frame-dot" />
        <span className="product-frame-dot" />
        <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          ERS · monthly pipeline
        </span>
      </div>
      <div className="wf-canvas">
        <svg className="wf-svg" viewBox="0 0 800 280" preserveAspectRatio="none" aria-hidden>
          <path
            d="M 70 150 C 180 80, 280 220, 400 140 S 620 60, 730 150"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1.5"
          />
          <path
            d="M 70 150 C 180 80, 280 220, 400 140 S 620 60, 730 150"
            fill="none"
            stroke="url(#ersPulse)"
            strokeWidth="1.5"
            strokeDasharray="12 220"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-232" dur="3.8s" repeatCount="indefinite" />
          </path>
          <defs>
            <linearGradient id="ersPulse" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EA4B71" />
              <stop offset="100%" stopColor="#FF6D3A" />
            </linearGradient>
          </defs>
        </svg>
        <div className="wf-row">
          {NODES.map((node) => (
            <article key={node.id} className="wf-node">
              <div className="wf-handle" />
              <p style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {node.id}
              </p>
              <h3>{node.title}</h3>
              <p>{node.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
