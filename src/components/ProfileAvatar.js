'use client';

import { useRef, useState } from 'react';
import { uploadProfileAvatar } from '@/lib/profile-avatar';

function emailInitial(email) {
  const e = String(email || '').trim();
  if (!e) return 'P';
  return e.charAt(0).toUpperCase();
}

/**
 * Circular profile avatar — optional pencil to change photo (uploads to Supabase Storage).
 */
export function ProfileAvatar({
  userId,
  email,
  avatarUrl,
  size = 'md',
  editable = false,
  onAvatarChange,
  className = '',
  onEditClick,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file) {
    if (!file || !userId) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadProfileAvatar(userId, file);
      onAvatarChange?.(url);
    } catch (e) {
      setError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function openPicker(e) {
    e.preventDefault();
    e.stopPropagation();
    onEditClick?.(e);
    if (!uploading) inputRef.current?.click();
  }

  const wrapClass = [
    'profile-avatar-wrap',
    `profile-avatar-wrap--${size}`,
    editable ? 'profile-avatar-wrap--editable' : '',
    uploading ? 'profile-avatar-wrap--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapClass}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="profile-avatar-img" draggable={false} />
      ) : (
        <span className="profile-avatar-initial" aria-hidden>
          {emailInitial(email)}
        </span>
      )}
      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="profile-avatar-file"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="profile-avatar-edit"
            aria-label={uploading ? 'Uploading photo…' : 'Change profile photo'}
            disabled={uploading}
            onClick={openPicker}
          >
            {uploading ? <span className="profile-avatar-spinner" aria-hidden /> : <PencilIcon />}
          </button>
        </>
      )}
      {error && (
        <span className="profile-avatar-error" role="status">
          {error}
        </span>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
