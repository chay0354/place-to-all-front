'use client';

import { useEffect, useState } from 'react';
import { getIdDocumentPreviewUrl } from '@/lib/id-document';
import { IdVerificationModal } from '@/components/IdVerificationModal';

function formatUploadedAt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return null;
  }
}

function pageCopy(hasDoc) {
  if (hasDoc) {
    return {
      title: 'Identity verified',
      lead: 'Your identity documents are on file. Update them anytime to keep your account in good standing.',
      hero: 'verified',
    };
  }
  return {
    title: 'Identity document expiring soon',
    lead: 'Please update promptly to avoid any disruption to your account functions.',
    hero: 'pending',
  };
}

/**
 * Identity verification screen (Security) — reference-style layout.
 */
export function IdDocumentUpload({
  userId,
  email,
  uid,
  memberSince,
  documentPath,
  documentBackPath,
  uploadedAt,
  onUploaded,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [frontPreview, setFrontPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const hasFront = Boolean(documentPath);
  const hasBack = Boolean(documentBackPath);
  const hasDoc = hasFront && hasBack;
  const hasPartial = hasFront || hasBack;
  const uploadedLabel = formatUploadedAt(uploadedAt);
  const copy = pageCopy(hasDoc);

  useEffect(() => {
    if (!documentPath) {
      setFrontPreview(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    getIdDocumentPreviewUrl(documentPath)
      .then((url) => {
        if (!cancelled) setFrontPreview(url);
      })
      .catch(() => {
        if (!cancelled) setFrontPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentPath]);

  function openVerification() {
    setModalOpen(true);
  }

  function openDetails() {
    setDetailsOpen(true);
  }

  return (
    <>
      <div className="id-auth-page">
        <div className="id-auth-hero">
          <div className={`id-auth-hero-icon id-auth-hero-icon--${copy.hero}`} aria-hidden>
            {copy.hero === 'verified' ? <VerifiedIcon /> : <ClockIcon />}
          </div>
          <h1 className="id-auth-title">{copy.title}</h1>
          <p className="id-auth-lead">{copy.lead}</p>
        </div>

        <button type="button" className="id-auth-row" onClick={openDetails}>
          <span className="id-auth-row-icon" aria-hidden>
            <IdCardIcon />
          </span>
          <span className="id-auth-row-text">
            <span className="id-auth-row-title">Personal details</span>
            <span className="id-auth-row-sub">
              {hasDoc ? 'View your verified information' : 'View your verified information'}
            </span>
          </span>
          <ChevronIcon />
        </button>

        {hasDoc && uploadedLabel && (
          <p className="id-auth-meta">Last verified {uploadedLabel}</p>
        )}

        {hasDoc && (
          <div className="id-auth-footer">
            <button type="button" className="id-auth-secondary id-auth-secondary--footer" onClick={openVerification}>
              Update ID photos
            </button>
          </div>
        )}
      </div>

      {detailsOpen && (
        <div className="idv-overlay" role="dialog" aria-modal="true" aria-labelledby="id-details-title">
          <button type="button" className="idv-backdrop" aria-label="Close" onClick={() => setDetailsOpen(false)} />
          <div className="idv-panel id-auth-details-sheet">
            <header className="idv-header">
              <h2 id="id-details-title" className="idv-title">
                Personal details
              </h2>
              <button type="button" className="idv-close" onClick={() => setDetailsOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            <dl className="id-auth-details-list">
              <div className="id-auth-details-item">
                <dt>Email</dt>
                <dd>{email || '—'}</dd>
              </div>
              <div className="id-auth-details-item">
                <dt>UID</dt>
                <dd>{uid || '—'}</dd>
              </div>
              {memberSince && (
                <div className="id-auth-details-item">
                  <dt>Member since</dt>
                  <dd>{memberSince}</dd>
                </div>
              )}
              <div className="id-auth-details-item">
                <dt>Verification status</dt>
                <dd>{hasDoc ? 'Verified' : hasPartial ? 'Incomplete' : 'Not verified'}</dd>
              </div>
              {uploadedLabel && hasDoc && (
                <div className="id-auth-details-item">
                  <dt>Verified on</dt>
                  <dd>{uploadedLabel}</dd>
                </div>
              )}
            </dl>
            {frontPreview && (
              <div className="id-auth-details-preview">
                <span className="id-auth-details-preview-label">ID front</span>
                {loadingPreview ? (
                  <div className="id-auth-details-preview-box">Loading…</div>
                ) : (
                  <img src={frontPreview} alt="" className="id-auth-details-preview-img" />
                )}
              </div>
            )}
            <button type="button" className="id-auth-cta id-auth-cta--in-sheet" onClick={() => setDetailsOpen(false)}>
              Done
            </button>
            {!hasDoc && (
              <button type="button" className="id-auth-secondary id-auth-secondary--in-sheet" onClick={() => { setDetailsOpen(false); openVerification(); }}>
                {hasPartial ? 'Continue verification' : 'Verify identity'}
              </button>
            )}
          </div>
        </div>
      )}

      <IdVerificationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
        onComplete={(result) => {
          onUploaded?.(result);
          setModalOpen(false);
        }}
      />
    </>
  );
}

function ClockIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10C8 19.5 5 15.5 5 11V6l7-3z" strokeLinejoin="round" />
    </svg>
  );
}

function IdCardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path d="M14 10h5M14 14h5M14 18h3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="id-auth-row-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
