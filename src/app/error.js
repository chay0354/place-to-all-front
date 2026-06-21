'use client';

export default function RouteError({ error, reset }) {
  const message = error?.message || String(error || 'Unknown error');
  const digest = error?.digest;
  const stack = error?.stack || '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#121214', border: '1px solid #2a2a2e', borderRadius: 16, padding: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Something went wrong</h1>
        <p style={{ margin: '0 0 1rem', color: '#9a9aa0', fontSize: '0.85rem' }}>
          Please screenshot this and send it over so we can fix it.
        </p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: '#0a0a0b',
            border: '1px solid #2a2a2e',
            borderRadius: 10,
            padding: '0.75rem',
            fontSize: '0.75rem',
            color: '#ff8a80',
            maxHeight: 240,
            overflow: 'auto',
            margin: '0 0 1rem',
          }}
        >
          {message}
          {digest ? `\n\ndigest: ${digest}` : ''}
          {stack ? `\n\n${stack}` : ''}
        </pre>
        <button
          type="button"
          onClick={() => reset()}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none', background: '#ff5a4e', color: '#fff', fontWeight: 600 }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
