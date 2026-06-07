'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadProfileAvatar } from '@/lib/profile-avatar';
import { AVATAR_PRESETS, presetImageUrl, presetAvatarToFile } from '@/lib/profile-avatar-presets';

function maskEmail(email) {
  const e = String(email || '').trim();
  const [local, domain] = e.split('@');
  if (!domain) return e;
  if (local.length <= 3) return `${local[0] || ''}****@${domain}`;
  return `${local.slice(0, 3)}****@${domain}`;
}

function emailInitial(email) {
  const e = String(email || '').trim();
  if (!e) return 'P';
  return e.charAt(0).toUpperCase();
}

export function ProfileAvatarEditorModal({ open, onClose, userId, email, avatarUrl, onSaved, onSavingChange }) {
  const inputRef = useRef(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customFile, setCustomFile] = useState(null);
  const [customPreview, setCustomPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedPreset(null);
    setCustomFile(null);
    setCustomPreview(null);
    setSaving(false);
    setError('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (customPreview) URL.revokeObjectURL(customPreview);
    };
  }, [customPreview]);

  if (!open) return null;

  const previewUrl = customPreview || (selectedPreset ? presetImageUrl(selectedPreset) : null);
  const hasSelection = Boolean(customFile || selectedPreset);

  async function handleSave() {
    if (!userId || !hasSelection) {
      onClose?.();
      return;
    }
    setSaving(true);
    onSavingChange?.(true);
    setError('');
    try {
      let url;
      if (customFile) {
        url = await uploadProfileAvatar(userId, customFile);
      } else if (selectedPreset) {
        const file = await presetAvatarToFile(selectedPreset);
        url = await uploadProfileAvatar(userId, file);
      }
      onSaved?.(url);
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Could not save photo');
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  function pickCustom() {
    inputRef.current?.click();
  }

  function onCustomSelected(file) {
    if (!file) return;
    if (customPreview) URL.revokeObjectURL(customPreview);
    setCustomFile(file);
    setCustomPreview(URL.createObjectURL(file));
    setSelectedPreset(null);
    setError('');
  }

  return (
    <div className="avatar-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="avatar-editor-title">
      <button type="button" className="avatar-editor-backdrop" aria-label="Close" onClick={onClose} disabled={saving} />
      <div className="avatar-editor-sheet">
        <div className="avatar-editor-grab" aria-hidden />
        <header className="avatar-editor-header">
          <h2 id="avatar-editor-title" className="avatar-editor-title">
            Edit profile photo
          </h2>
          <button type="button" className="avatar-editor-close" onClick={onClose} disabled={saving} aria-label="Close">
            ×
          </button>
        </header>

        <div className="avatar-editor-preview-wrap">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="avatar-editor-preview" draggable={false} />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-editor-preview" draggable={false} />
          ) : (
            <span className="avatar-editor-preview avatar-editor-preview--initial" aria-hidden>
              {emailInitial(email)}
            </span>
          )}
        </div>

        <section className="avatar-editor-section">
          <div className="avatar-editor-section-head">
            <span className="avatar-editor-section-title">
              Customize avatar
              <span className="avatar-editor-info" title="Upload your own photo" aria-hidden>
                ?
              </span>
            </span>
          </div>
          <button type="button" className="avatar-editor-custom-row" onClick={pickCustom} disabled={saving}>
            <p className="avatar-editor-custom-text">
              Use your email &apos;{maskEmail(email)}&apos; to sign in and authorize a custom avatar
            </p>
            <span className="avatar-editor-custom-action" aria-hidden>
              <span className="avatar-editor-plus">+</span>
              <ChevronIcon />
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="profile-avatar-file"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => {
              onCustomSelected(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </section>

        <section className="avatar-editor-section">
          <div className="avatar-editor-section-head">
            <span className="avatar-editor-section-title">Select an avatar</span>
            <span className="avatar-editor-badge">Free</span>
          </div>
          <div className="avatar-editor-presets" role="listbox" aria-label="Preset avatars">
            {AVATAR_PRESETS.map((preset) => {
              const selected = selectedPreset === preset.id && !customFile;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`avatar-editor-preset ${selected ? 'avatar-editor-preset--on' : ''}`}
                  disabled={saving}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    if (customPreview) URL.revokeObjectURL(customPreview);
                    setCustomFile(null);
                    setCustomPreview(null);
                    setError('');
                  }}
                >
                  <img src={preset.src} alt="" draggable={false} />
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <p className="avatar-editor-error" role="alert">
            {error}
          </p>
        )}

        <button type="button" className="avatar-editor-save" onClick={handleSave} disabled={saving || !hasSelection}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
