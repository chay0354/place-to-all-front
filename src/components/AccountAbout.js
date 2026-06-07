'use client';

import { useCallback, useEffect, useState } from 'react';
import appIcon from '@/app/icon.png';
import { updateProfile } from '@/lib/api';

function formatCacheSize(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 0.05) return '< 0.1 MB';
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

async function measureCacheBytes() {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  let total = 0;
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      const cache = await caches.open(key);
      const requests = await cache.keys();
      for (const req of requests) {
        const res = await cache.match(req);
        if (!res) continue;
        const blob = await res.clone().blob();
        total += blob.size;
      }
    }
  } catch {
    return 0;
  }
  return total;
}

async function clearAppCache() {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  }
}

function AboutMenuRow({ label, trailing, onClick }) {
  return (
    <button type="button" className="account-about-row" onClick={onClick}>
      <span className="account-about-row-label">{label}</span>
      <span className="account-about-row-right">
        {trailing && <span className="account-about-row-trailing">{trailing}</span>}
        <ChevronRightIcon />
      </span>
    </button>
  );
}

function AboutSheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="idv-overlay" role="dialog" aria-modal="true" aria-labelledby="about-sheet-title">
      <button type="button" className="idv-backdrop" aria-label="Close" onClick={onClose} />
      <div className="idv-panel account-about-sheet">
        <header className="idv-header">
          <h2 id="about-sheet-title" className="idv-title">
            {title}
          </h2>
          <button type="button" className="idv-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="account-about-sheet-body">{children}</div>
        {footer}
      </div>
    </div>
  );
}

export function AccountAbout({ version = '1.0.0', npsScore = null, onNpsSaved }) {
  const [rating, setRating] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ratedLocally, setRatedLocally] = useState(false);
  const showNps = npsScore == null && !ratedLocally;
  const [sheet, setSheet] = useState(null);
  const [cacheBytes, setCacheBytes] = useState(0);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheMessage, setCacheMessage] = useState('');

  const refreshCacheSize = useCallback(async () => {
    const bytes = await measureCacheBytes();
    setCacheBytes(bytes);
  }, []);

  useEffect(() => {
    refreshCacheSize();
  }, [refreshCacheSize]);

  async function handleSubmit() {
    if (!rating || submitting || !showNps) return;
    setSubmitting(true);
    setError('');
    try {
      await updateProfile({ nps_score: rating });
      setRatedLocally(true);
      onNpsSaved?.(rating);
    } catch (e) {
      setError(e?.message || 'Could not save your rating');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClearCache() {
    setCacheClearing(true);
    setCacheMessage('');
    try {
      await clearAppCache();
      await refreshCacheSize();
      setCacheMessage('Cache cleared successfully.');
      setTimeout(() => setSheet(null), 900);
    } catch {
      setCacheMessage('Could not clear cache. Try again.');
    } finally {
      setCacheClearing(false);
    }
  }

  return (
    <div className="account-subview account-about">
      <div className="account-about-brand">
        <img src={appIcon.src} alt="" className="account-about-app-icon" width={72} height={72} draggable={false} />
        <p className="account-about-version">Version {version}</p>
      </div>

      {showNps && (
        <div className="account-about-nps">
          <p className="account-about-nps-question">Would you recommend Place to All to friends?</p>
          <div className="account-about-nps-scale" role="group" aria-label="Recommendation score 1 to 10">
            {Array.from({ length: 10 }, (_, i) => {
              const n = i + 1;
              const selected = rating === n;
              return (
                <button
                  key={n}
                  type="button"
                  className={`account-about-nps-num ${selected ? 'account-about-nps-num--on' : ''}`}
                  aria-pressed={selected}
                  disabled={submitting}
                  onClick={() => {
                    setRating(n);
                    setError('');
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {error && (
            <p className="account-about-nps-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="account-about-nps-submit"
            disabled={!rating || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Saving…' : 'Submit'}
          </button>
        </div>
      )}

      <nav className="account-about-menu" aria-label="About">
        <AboutMenuRow label="App upgrade" trailing={`v ${version}`} onClick={() => setSheet('upgrade')} />
        <AboutMenuRow label="Privacy Policy" onClick={() => setSheet('privacy')} />
        <AboutMenuRow label="Terms & Conditions" onClick={() => setSheet('terms')} />
        <AboutMenuRow
          label="Clear cache"
          trailing={formatCacheSize(cacheBytes)}
          onClick={() => {
            setCacheMessage('');
            setSheet('cache');
          }}
        />
      </nav>

      {sheet === 'upgrade' && (
        <AboutSheet title="App upgrade" onClose={() => setSheet(null)}>
          <p className="account-about-sheet-lead">
            You&apos;re on the latest version of Place to All.
          </p>
          <p className="account-about-sheet-meta">Current version: {version}</p>
          <button type="button" className="account-about-sheet-btn" onClick={() => window.location.reload()}>
            Refresh app
          </button>
        </AboutSheet>
      )}

      {sheet === 'privacy' && (
        <AboutSheet title="Privacy Policy" onClose={() => setSheet(null)}>
          <div className="account-about-sheet-scroll">
            <p>
              Place to All respects your privacy. We collect only the information needed to operate your account,
              process payments, and keep the service secure.
            </p>
            <p>
              This includes your email, profile details, wallet activity, and documents you submit for identity
              verification. We do not sell your personal data.
            </p>
            <p>
              Data is stored securely and used to provide core features such as transfers, card services, and account
              support. You may request account deletion by contacting support.
            </p>
            <p className="account-about-sheet-muted">Last updated: May 2026</p>
          </div>
        </AboutSheet>
      )}

      {sheet === 'terms' && (
        <AboutSheet title="Terms & Conditions" onClose={() => setSheet(null)}>
          <p className="account-about-sheet-coming">Coming soon</p>
        </AboutSheet>
      )}

      {sheet === 'cache' && (
        <AboutSheet title="Clear cache" onClose={() => !cacheClearing && setSheet(null)}>
          <p className="account-about-sheet-lead">
            This clears cached images and files stored on this device ({formatCacheSize(cacheBytes)}). Your account and
            sign-in stay intact.
          </p>
          {cacheMessage && (
            <p className={`account-about-sheet-msg ${cacheMessage.includes('success') ? 'account-about-sheet-msg--ok' : ''}`} role="status">
              {cacheMessage}
            </p>
          )}
          <button
            type="button"
            className="account-about-sheet-btn"
            disabled={cacheClearing}
            onClick={handleClearCache}
          >
            {cacheClearing ? 'Clearing…' : 'Clear cache'}
          </button>
        </AboutSheet>
      )}
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="account-about-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
