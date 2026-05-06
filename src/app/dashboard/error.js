'use client';

/**
 * Catches runtime errors under /dashboard/* so a failed chunk or client bug
 * does not surface as an opaque 500 without recovery UI.
 */
export default function DashboardError({ error, reset }) {
  return (
    <div className="dashboard-wallet-ui" style={{ padding: '2rem 1.25rem', maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>Something went wrong</h2>
      <p style={{ color: 'var(--muted-foreground, #888)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        {error?.digest ? 'Please try again.' : error?.message || 'Unexpected error loading this page.'}
      </p>
      <button
        type="button"
        className="dash-btn-primary"
        style={{
          padding: '0.65rem 1.25rem',
          borderRadius: 999,
          border: 'none',
          background: 'var(--accent, #e85d4c)',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 600,
        }}
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
