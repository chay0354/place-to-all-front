'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadVerifiedIdDocuments, validateIdDocumentSide } from '@/lib/id-document';

const STEPS = [
  { key: 'front', label: 'Front', title: 'Front of ID' },
  { key: 'back', label: 'Back', title: 'Back of ID' },
];

/**
 * Two-step ID verification — full-screen flow with AI validation before upload.
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
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
    return () => {
      document.body.style.overflow = prev;
    };
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
      setError('Please add a photo first.');
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
  const primaryLabel = submitting
    ? 'Saving…'
    : checking
      ? 'Verifying…'
      : step === 1
        ? 'Verify & submit'
        : 'Verify & continue';

  return (
    <div className="idv-overlay idv-overlay--fullscreen" role="dialog" aria-modal="true" aria-labelledby="idv-title">
      <div className="idv-panel idv-panel--fullscreen">
        <header className="idv-fs-toolbar">
          <button
            type="button"
            className="idv-fs-icon-btn"
            aria-label={step > 0 ? 'Previous step' : 'Close'}
            onClick={step > 0 ? goBack : onClose}
            disabled={busy && step === 0}
          >
            <BackIcon />
          </button>
          <span className="idv-fs-toolbar-title">Identity verification</span>
          <button type="button" className="idv-fs-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="idv-fs-progress" aria-label="Verification progress">
          {STEPS.map((s, i) => {
            const done = (i === 0 && frontOk) || (i === 1 && backOk);
            const active = i === step;
            return (
              <div key={s.key} className={`idv-fs-progress-item ${active ? 'idv-fs-progress-item--active' : ''} ${done ? 'idv-fs-progress-item--done' : ''}`}>
                <span className="idv-fs-progress-dot" aria-hidden>
                  {done ? <CheckIcon /> : i + 1}
                </span>
                <span className="idv-fs-progress-label">{s.label}</span>
              </div>
            );
          })}
          <div className="idv-fs-progress-track" aria-hidden>
            <div className="idv-fs-progress-fill" style={{ width: step === 0 ? '50%' : '100%' }} />
          </div>
        </div>

        <div className="idv-fs-body">
          <h2 id="idv-title" className="idv-fs-title">
            {STEPS[step].title}
          </h2>
          <p className="idv-fs-lead">
            {step === 0
              ? 'Photograph the front of your passport, national ID, or driver’s license. All corners must be visible and text readable.'
              : 'Photograph the back of your ID card, or the visa / data page if you uploaded a passport.'}
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
            className={`idv-fs-dropzone ${currentPreview ? 'idv-fs-dropzone--filled' : ''}`}
            onClick={pickFile}
            disabled={busy}
          >
            {currentPreview ? (
              <>
                <img src={currentPreview} alt="" className="idv-fs-preview-img" />
                <span className="idv-fs-dropzone-overlay">Tap to replace photo</span>
              </>
            ) : (
              <div className="idv-fs-dropzone-empty">
                <span className="idv-fs-dropzone-icon" aria-hidden>
                  <CameraIcon />
                </span>
                <span className="idv-fs-dropzone-text">Tap to add photo</span>
                <span className="idv-fs-dropzone-hint">JPG, PNG or WebP</span>
              </div>
            )}
          </button>

          {frontOk && step === 1 && (
            <p className="idv-fs-pass" role="status">
              Front verified — add the back side to finish.
            </p>
          )}

          {error && (
            <p className="idv-fs-error" role="alert">
              {error}
            </p>
          )}

          <p className="idv-fs-footnote">
            Photos are checked automatically and stored securely. Only you can access your documents.
          </p>
        </div>

        <footer className="idv-fs-footer">
          <button
            type="button"
            className="idv-fs-cta"
            onClick={verifyCurrent}
            disabled={busy || !currentFile}
          >
            {primaryLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
