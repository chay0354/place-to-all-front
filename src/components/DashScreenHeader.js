'use client';

import Link from 'next/link';

/**
 * In-page header for dashboard sub-screens (title only, optional back — no action icons).
 */
export function DashScreenHeader({ title, backHref, onBack, onBackClick, backLabel = 'Go back' }) {
  let backControl = null;
  if (backHref) {
    backControl = (
      <Link href={backHref} className="dash-screen-back" aria-label={backLabel} onClick={onBackClick}>
        <BackIcon />
      </Link>
    );
  } else if (onBack) {
    backControl = (
      <button type="button" className="dash-screen-back" aria-label={backLabel} onClick={onBack}>
        <BackIcon />
      </button>
    );
  }

  return (
    <header className={`dash-screen-header${backControl ? ' dash-screen-header--with-back' : ''}`}>
      {backControl}
      <h1 className="dash-screen-title">{title}</h1>
    </header>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
