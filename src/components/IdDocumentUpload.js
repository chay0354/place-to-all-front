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

/**
 * Identity document upload on the Security / profile page (private storage + AI validation).
 */
export function IdDocumentUpload({ userId, documentPath, documentBackPath, uploadedAt, onUploaded }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const hasFront = Boolean(documentPath);
  const hasBack = Boolean(documentBackPath);
  const hasDoc = hasFront && hasBack;
  const uploadedLabel = formatUploadedAt(uploadedAt);

  useEffect(() => {
    if (!documentPath && !documentBackPath) {
      setFrontPreview(null);
      setBackPreview(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    Promise.all([
      documentPath ? getIdDocumentPreviewUrl(documentPath) : null,
      documentBackPath ? getIdDocumentPreviewUrl(documentBackPath) : null,
    ])
      .then(([front, back]) => {
        if (!cancelled) {
          setFrontPreview(front);
          setBackPreview(back);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFrontPreview(null);
          setBackPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentPath, documentBackPath]);

  function statusLabel() {
    if (hasDoc) return 'Verified';
    if (hasFront || hasBack) return 'Incomplete';
    return 'Not uploaded';
  }

  return (
    <>
      <section className="account-id-section" aria-labelledby="account-id-heading">
        <div className="account-id-header">
          <h2 id="account-id-heading" className="account-id-title">
            Identity verification
          </h2>
          <span
            className={`account-id-status ${
              hasDoc ? 'account-id-status--ok' : hasFront || hasBack ? 'account-id-status--pending' : 'account-id-status--pending'
            }`}
          >
            {statusLabel()}
          </span>
        </div>
        <p className="account-id-lead">
          Upload clear photos of the front and back of your government ID. We verify each image before saving. Stored
          securely and only visible to you.
        </p>

        {(hasFront || hasBack) && (
          <div className="account-id-preview-grid">
            <div className="account-id-preview-card">
              <span className="account-id-preview-label">Front</span>
              {loadingPreview ? (
                <div className="account-id-preview account-id-preview--empty">Loading…</div>
              ) : frontPreview ? (
                <img src={frontPreview} alt="ID front" className="account-id-preview" />
              ) : (
                <div className="account-id-preview account-id-preview--empty">
                  {hasFront ? 'Preview unavailable' : 'Missing'}
                </div>
              )}
            </div>
            <div className="account-id-preview-card">
              <span className="account-id-preview-label">Back</span>
              {loadingPreview ? (
                <div className="account-id-preview account-id-preview--empty">Loading…</div>
              ) : backPreview ? (
                <img src={backPreview} alt="ID back" className="account-id-preview" />
              ) : (
                <div className="account-id-preview account-id-preview--empty">
                  {hasBack ? 'Preview unavailable' : 'Missing'}
                </div>
              )}
            </div>
          </div>
        )}

        {uploadedLabel && hasDoc && <p className="account-id-uploaded-at">Verified {uploadedLabel}</p>}

        <button type="button" className="account-id-upload-btn" onClick={() => setModalOpen(true)}>
          {hasDoc ? 'Replace ID photos' : 'Start verification'}
        </button>
      </section>

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
