'use client';

const HANDLE = '@PlaceToAll';

/** Official brand marks via Simple Icons CDN (https://simpleicons.org). */
const CHANNELS = [
  {
    id: 'telegram',
    name: 'Telegram',
    iconUrl: 'https://cdn.simpleicons.org/telegram/ffffff',
    iconClass: 'account-community-icon--telegram',
  },
  {
    id: 'discord',
    name: 'Discord',
    iconUrl: 'https://cdn.simpleicons.org/discord/ffffff',
    iconClass: 'account-community-icon--discord',
  },
  {
    id: 'twitter',
    name: 'Twitter',
    iconUrl: 'https://cdn.simpleicons.org/x/ffffff',
    iconClass: 'account-community-icon--twitter',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    iconUrl: 'https://cdn.simpleicons.org/facebook/ffffff',
    iconClass: 'account-community-icon--facebook',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    iconUrl: '/icons/linkedin.svg',
    iconClass: 'account-community-icon--linkedin',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    iconUrl: 'https://cdn.simpleicons.org/instagram/ffffff',
    iconClass: 'account-community-icon--instagram',
  },
];

function CommunityHeroArt() {
  return (
    <svg className="account-community-hero-art" viewBox="0 0 320 140" aria-hidden>
      <ellipse cx="72" cy="28" rx="28" ry="10" fill="rgba(255,255,255,0.12)" />
      <ellipse cx="248" cy="22" rx="34" ry="11" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="168" cy="18" rx="22" ry="8" fill="rgba(255,255,255,0.08)" />
      <g transform="translate(24,48)">
        <circle cx="24" cy="18" r="12" fill="#f2c9a0" />
        <rect x="12" y="32" width="24" height="34" rx="10" fill="#6b8cff" />
        <circle cx="68" cy="16" r="11" fill="#e8b4b8" />
        <rect x="57" y="29" width="22" height="36" rx="9" fill="#ff8b7b" />
        <circle cx="108" cy="20" r="13" fill="#d4a574" />
        <rect x="94" y="35" width="28" height="38" rx="11" fill="#7dcea0" />
        <circle cx="152" cy="14" r="10" fill="#f2c9a0" />
        <rect x="142" y="26" width="20" height="32" rx="8" fill="#c9a0ff" />
        <circle cx="192" cy="18" r="12" fill="#8ecae6" />
        <rect x="180" y="32" width="24" height="36" rx="10" fill="#ffd166" />
        <circle cx="232" cy="16" r="11" fill="#e8b4b8" />
        <rect x="221" y="29" width="22" height="34" rx="9" fill="#90be6d" />
        <circle cx="272" cy="20" r="12" fill="#d4a574" />
        <rect x="260" y="34" width="24" height="36" rx="10" fill="#4cc9f0" />
      </g>
    </svg>
  );
}

export function AccountCommunity() {
  return (
    <div className="account-subview account-community">
      <div className="account-community-hero">
        <CommunityHeroArt />
        <p className="account-community-welcome">
          Welcome to the Place to All
          <br />
          community!
        </p>
      </div>

      <div className="account-community-grid" role="list" aria-label="Community channels">
        {CHANNELS.map(({ id, name, iconUrl, iconClass }) => (
          <button
            key={id}
            type="button"
            className="account-community-channel"
            role="listitem"
            aria-disabled="true"
            tabIndex={-1}
            onClick={(e) => e.preventDefault()}
          >
            <span className={`account-community-icon ${iconClass}`}>
              <img src={iconUrl} alt="" width={20} height={20} draggable={false} className="account-community-icon-img" />
            </span>
            <span className="account-community-channel-text">
              <span className="account-community-channel-name">{name}</span>
              <span className="account-community-channel-handle">{HANDLE}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
