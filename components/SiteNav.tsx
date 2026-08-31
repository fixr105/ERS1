'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`site-nav${scrolled ? ' is-scrolled' : ''}`} aria-label="Primary">
      <div className="site-nav-inner">
        <Link href="/" className="brand-mark">
          Seven Fincorp
        </Link>
        <div className="nav-links">
          <a href="#start">Start review</a>
          <a href="#pipeline">Pipeline</a>
          <a href="#stages">Stages</a>
        </div>
        <a href="#start" className="btn-primary" style={{ minHeight: 40, padding: '8px 16px', fontSize: 13 }}>
          Begin
        </a>
      </div>
    </nav>
  );
}
