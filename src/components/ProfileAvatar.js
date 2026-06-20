'use client';

import { useState } from 'react';
import { ProfileAvatarEditorModal } from '@/components/ProfileAvatarEditorModal';
import { countryFlagUrl, countryNameFromIso } from '@/lib/phone-country';

function emailInitial(email) {
  const e = String(email || '').trim();
  if (!e) return 'P';
  return e.charAt(0).toUpperCase();
}

/**
 * Circular profile avatar — pencil opens edit sheet (presets + custom upload).
 */
export function ProfileAvatar({
  userId,
  email,
  avatarUrl,
  size = 'md',
  editable = false,
  countryIso = null,
  onAvatarChange,
  className = '',
  onEditClick,
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  function openEditor(e) {
    e.preventDefault();
    e.stopPropagation();
    onEditClick?.(e);
    if (!uploading) setEditorOpen(true);
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

  const flagUrl = countryIso ? countryFlagUrl(countryIso) : null;
  const flagLabel = countryIso ? countryNameFromIso(countryIso) : null;

  return (
    <>
      <div className={wrapClass}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="profile-avatar-img" draggable={false} />
        ) : (
          <span className="profile-avatar-initial" aria-hidden>
            {emailInitial(email)}
          </span>
        )}
        {flagUrl && (
          <span className="profile-avatar-flag" aria-label={flagLabel ? `Country: ${flagLabel}` : undefined} title={flagLabel || countryIso}>
            <img src={flagUrl} alt="" className="profile-avatar-flag-img" draggable={false} />
          </span>
        )}
        {editable && (
          <button
            type="button"
            className={`profile-avatar-edit${flagUrl ? ' profile-avatar-edit--with-flag' : ''}`}
            aria-label="Change profile photo"
            disabled={uploading}
            onClick={openEditor}
          >
            {uploading ? <span className="profile-avatar-spinner" aria-hidden /> : <PencilIcon />}
          </button>
        )}
      </div>

      {editable && (
        <ProfileAvatarEditorModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          userId={userId}
          email={email}
          avatarUrl={avatarUrl}
          onSavingChange={setUploading}
          onSaved={(url) => onAvatarChange?.(url)}
        />
      )}
    </>
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
