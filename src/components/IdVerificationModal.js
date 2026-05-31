'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadVerifiedIdDocuments, validateIdDocumentSide } from '@/lib/id-document';

const STEPS = [
  { key: 'front', label: 'Front', title: 'Front of ID' },
  { key: 'back', label: 'Back', title: 'Back of ID' },
];

function StepIcon({ done, active, number }) {
  if (done) {
    return (
      <span className="idv-step-icon idv-step-icon--done" aria-hidden>
        ✓
      </span>
    );
  }
  return (
    <span className={`idv-step-icon ${active ? 'idv-step-icon--active' : ''}`} aria-hidden>
      {number}
    </span>
  );
}

/**
 * Two-step ID verification modal: validate front & back with OpenAI before upload.
 */
export function IdVerificationModal({ open, onClose, userId, onComplete }) {
  const inputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [frontOk, setFrontOk] = useState(false);
  const [backOk, setBackOk] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentSide = step === 0 ? 'front' : 'back';
  const currentFile = step === 0 ? frontFile : backFile;
  const currentPreview = step === 0 ? frontPreview : backPreview;

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview(null);
    setBackPreview(null);
    setFrontOk(false);
    setBackOk(false);
    setChecking(false);
    setSubmitting(false);
    setError('');
  }, [open]);

  useEffect(() => {
    return () => {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      if (backPreview) URL.revokeObjectURL(backPreview);
    };
  }, [frontPreview, backPreview]);

  if (!open) return null;

  function pickFile() {
    setError('');
    inputRef.current?.click();
  }

  function handleFileSelected(file) {
    if (!file) return;
    setError('');
    const url = URL.createObjectURL(file);
    if (step === 0) {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      setFrontFile(file);
      setFrontPreview(url);
      setFrontOk(false);
    } else {
      if (backPreview) URL.revokeObjectURL(backPreview);
      setBackFile(file);
      setBackPreview(url);
      setBackOk(false);
    }
  }

  async function verifyCurrent() {
    if (!currentFile) {
      setError('Please select a photo first.');
      return;
    }
    setChecking(true);
    setError('');
    try {
      await validateIdDocumentSide(currentFile, currentSide);
      if (step === 0) {
        setFrontOk(true);
        setStep(1);
      } else {
        setBackOk(true);
        await submitBoth(frontFile, currentFile);
      }
    } catch (e) {
      setError(e?.message || 'Verification failed');
    } finally {
      setChecking(false);
    }
  }

  async function submitBoth(front, back) {
    setSubmitting(true);
    setError('');
    try {
      const result = await uploadVerifiedIdDocuments(userId, front, back);
      onComplete?.(result);
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step === 0 || checking || submitting) return;
    setError('');
    setStep(0);
  }

  const busy = checking || submitting;

  return (
    <div className="idv-overlay" role="dialog" aria-modal="true" aria-labelledby="idv-title">
      <button type="button" className="idv-backdrop" aria-label="Close" onClick={onClose} disabled={busy} />
      <div className="idv-panel">
        <header className="idv-header">
          <div>
            <p className="idv-eyebrow">Identity verification</p>
            <h2 id="idv-title" className="idv-title">
              {STEPS[step].title}
            </h2>
          </div>
          <button type="button" className="idv-close" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </header>

        <div className="idv-steps" aria-label="Verification progress">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`idv-step ${i === step ? 'idv-step--current' : ''} ${i < step || (i === 0 && frontOk) ? 'idv-step--done' : ''}`}>
              <StepIcon done={(i === 0 && frontOk) || (i === 1 && backOk)} active={i === step} number={i + 1} />
              <span className="idv-step-label">{s.label}</span>
            </div>
          ))}
        </div>

        <p className="idv-lead">
          {step === 0
            ? 'Photograph the front of your passport, national ID, or driver’s license. Ensure all corners are visible and text is readable.'
            : 'Now photograph the back of your ID card, or the visa / data page if you uploaded a passport.'}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="profile-avatar-file"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            handleFileSelected(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          className={`idv-dropzone ${currentPreview ? 'idv-dropzone--filled' : ''}`}
          onClick={pickFile}
          disabled={busy}
        >
          {currentPreview ? (
            <img src={currentPreview} alt="" className="idv-preview-img" />
          ) : (
            <>
              <span className="idv-dropzone-icon" aria-hidden>
                📷
              </span>
              <span className="idv-dropzone-text">Tap to add photo</span>
              <span className="idv-dropzone-hint">JPG, PNG or WebP · large photos are compressed automatically</span>
            </>
          )}
        </button>

        {currentPreview && !busy && (
          <button type="button" className="idv-retake" onClick={pickFile}>
            Choose a different photo
          </button>
        )}

        {frontOk && step === 1 && (
          <p className="idv-pass" role="status">
            Front verified — continue with the back side.
          </p>
        )}

        {error && (
          <p className="idv-error" role="alert">
            {error}
          </p>
        )}

        <div className="idv-actions">
          {step > 0 && (
            <button type="button" className="idv-btn idv-btn--ghost" onClick={goBack} disabled={busy}>
              Back
            </button>
          )}
          <button type="button" className="idv-btn idv-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="idv-btn idv-btn--primary" onClick={verifyCurrent} disabled={busy || !currentFile}>
            {submitting ? 'Saving…' : checking ? 'Verifying…' : step === 1 ? 'Verify & submit' : 'Verify & continue'}
          </button>
        </div>

        <p className="idv-footnote">
          Photos are checked automatically and stored securely. Only you can access your documents.
        </p>
      </div>
    </div>
  );
}
