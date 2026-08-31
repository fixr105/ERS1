export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-container footer-grid">
        <div className="footer-col">
          <p className="brand-mark" style={{ marginBottom: 12 }}>
            Seven Fincorp
          </p>
          <p>
            Confidential monthly review system. Self-assessment, evidence, interview, peers, and a
            compiled report — one session per employee.
          </p>
        </div>
        <div className="footer-col">
          <h4>Review</h4>
          <a href="#start">Start this month</a>
          <a href="#pipeline">Five-stage pipeline</a>
          <a href="#stages">Stage map</a>
        </div>
        <div className="footer-col">
          <h4>Integrity</h4>
          <p>Keyboard-only answers</p>
          <p>Paste blocked on assessments</p>
          <p>Airtable session record</p>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <p>Internal use only</p>
          <p>Do not share reports externally</p>
          <p>© {new Date().getFullYear()} Seven Fincorp</p>
        </div>
      </div>
    </footer>
  );
}
