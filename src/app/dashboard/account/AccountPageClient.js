'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getTransactions, getProfile, getProfileDownline, createPaymentLink, listPaymentLinks } from '@/lib/api';
import { isAdminOperatorEmail } from '@/lib/admin-config';
import { siteUrl } from '@/lib/site-url';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { AccountInviteCard } from '@/components/AccountInviteCard';
import { resolveUserCountryIso } from '@/lib/phone-country';
import { clearPinUnlocked } from '@/lib/quick-pin-session';

const AccountSecurity = dynamic(
  () => import('@/components/AccountSecurity').then((m) => m.AccountSecurity),
  { loading: () => <p className="account-empty">Loading…</p> },
);
const AccountCommunity = dynamic(
  () => import('@/components/AccountCommunity').then((m) => m.AccountCommunity),
  { loading: () => <p className="account-empty">Loading…</p> },
);
const AccountAbout = dynamic(
  () => import('@/components/AccountAbout').then((m) => m.AccountAbout),
  { loading: () => <p className="account-empty">Loading…</p> },
);
const IdDocumentUpload = dynamic(
  () => import('@/components/IdDocumentUpload').then((m) => m.IdDocumentUpload),
  { loading: () => <p className="account-empty">Loading…</p> },
);
const IdVerificationModal = dynamic(
  () => import('@/components/IdVerificationModal').then((m) => m.IdVerificationModal),
  { ssr: false },
);

const APP_VERSION = '1.0.0';

function maskEmail(email) {
  const e = String(email || '').trim();
  const [local, domain] = e.split('@');
  if (!domain) return e;
  if (local.length <= 3) return `${local[0] || ''}****@${domain}`;
  return `${local.slice(0, 3)}****@${domain}`;
}

function displayUid(userId) {
  if (!userId) return '—';
  let h = 0;
  for (let i = 0; i < userId.length; i += 1) {
    h = (Math.imul(31, h) + userId.charCodeAt(i)) >>> 0;
  }
  return String(h).padStart(10, '0').slice(0, 10);
}

function roleLabel(role) {
  if (role === 'super_super_agent') return 'Super super agent';
  if (role === 'super_agent') return 'Super agent';
  if (role === 'agent') return 'Agent';
  if (role === 'admin') return 'Admin';
  return 'Member';
}

export function AccountPageClient({ initialUser = null, initialProfile = null }) {
  const [user, setUser] = useState(() =>
    initialUser
      ? { id: initialUser.id, email: initialUser.email, phone: initialUser.phone ?? null }
      : null,
  );
  const [token, setToken] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [loading, setLoading] = useState(!initialUser);
  const [profileReady, setProfileReady] = useState(Boolean(initialProfile));
  const [profile, setProfile] = useState(initialProfile);
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [plTitle, setPlTitle] = useState('');
  const [plCurrency, setPlCurrency] = useState('USDT');
  const [plAmount, setPlAmount] = useState('');
  const [plLoading, setPlLoading] = useState(false);
  const [plMessage, setPlMessage] = useState('');
  const [downline, setDownline] = useState(null);
  const [downlineLoading, setDownlineLoading] = useState(false);
  const [view, setView] = useState('hub');
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    if (initialUser) {
      supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token));
      return;
    }
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setLoading(false);
      if (!u) router.push('/login');
    });
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token));
  }, [router, initialUser]);

  useEffect(() => {
    if (view !== 'transactions' || !user?.id) return;
    setTxLoading(true);
    getTransactions(user.id, token)
      .then((list) => setTransactions(Array.isArray(list) ? list : []))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [view, user?.id, token]);

  useEffect(() => {
    if (!user?.id) {
      if (!initialProfile) setProfileReady(false);
      return;
    }
    if (initialProfile) return;
    let cancelled = false;
    setProfileReady(false);
    getProfile()
      .then((p) => {
        if (!cancelled) setProfile(p || { role: 'regular' });
      })
      .catch(() => {
        if (!cancelled) setProfile({ role: 'regular' });
      })
      .finally(() => {
        if (!cancelled) setProfileReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, initialProfile]);

  useEffect(() => {
    if (view !== 'downline') {
      return;
    }
    const r = profile?.role;
    if (r !== 'agent' && r !== 'super_agent' && r !== 'super_super_agent') {
      setDownline(null);
      return;
    }
    setDownlineLoading(true);
    getProfileDownline()
      .then((d) => setDownline(d && typeof d === 'object' ? d : { kind: 'none', members: [] }))
      .catch(() =>
        setDownline({ kind: r === 'super_agent' || r === 'super_super_agent' ? 'agents' : 'regulars', members: [] }),
      )
      .finally(() => setDownlineLoading(false));
  }, [view, profile?.role]);

  const isAgentLike =
    profile?.role === 'agent' || profile?.role === 'super_agent' || profile?.role === 'super_super_agent';
  const isAdmin = profile?.role === 'admin' || isAdminOperatorEmail(user?.email);
  const canSeeAffiliation = isAgentLike || isAdmin;

  const idVerified = Boolean(profile?.id_document_path && profile?.id_document_back_path);
  const idPartial = Boolean(profile?.id_document_path || profile?.id_document_back_path) && !idVerified;

  const canManagePaymentLinks = useMemo(() => {
    if (profile == null) return false;
    const role = profile.role || 'regular';
    return ['regular', 'agent', 'super_agent', 'super_super_agent', 'admin'].includes(role);
  }, [profile]);

  function refreshPaymentLinks() {
    if (!user?.id || !token || !canManagePaymentLinks) return;
    listPaymentLinks(user.id, token)
      .then((list) => setPaymentLinks(Array.isArray(list) ? list : []))
      .catch(() => setPaymentLinks([]));
  }

  useEffect(() => {
    if (view !== 'payment-links' || !canManagePaymentLinks || isAgentLike || !user?.id || !token) return;
    refreshPaymentLinks();
  }, [view, canManagePaymentLinks, isAgentLike, user?.id, token]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function copyText(key, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? '' : c)), 2000);
    } catch {
      /* ignore */
    }
  }

  function formatAmount(amount, currency) {
    const n = Number(amount);
    if (currency === 'USDT' || currency === 'USDC') return n.toFixed(2);
    if (n >= 1) return n.toFixed(4);
    if (n >= 0.0001) return n.toFixed(6);
    return n.toFixed(8);
  }

  function goHub() {
    setView('hub');
  }

  function goBack() {
    if (view === 'identity') {
      setView('security');
      return;
    }
    goHub();
  }

  function handleAvatarChange(url) {
    setProfile((p) => ({ ...(p || {}), avatar_url: url }));
  }

  function handleIdUploaded({ path, backPath, uploadedAt }) {
    setProfile((p) => ({
      ...(p || {}),
      id_document_path: path,
      id_document_back_path: backPath,
      id_document_uploaded_at: uploadedAt,
    }));
  }

  if (loading || !user) {
    return (
      <div className="account-hub">
        <header className="account-hub-toolbar">
          <Link href="/dashboard" className="account-hub-icon-btn" aria-label="Back to home">
            <BackIcon />
          </Link>
        </header>
        <div className="account-profile-row account-profile-row--skeleton" aria-hidden />
        <nav className="account-menu" aria-label="Account menu">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="account-menu-skeleton" aria-hidden />
          ))}
        </nav>
      </div>
    );
  }

  const uid = displayUid(user.id);
  const masked = maskEmail(user.email);

  const hubTitle =
    view === 'profile'
      ? 'Profile'
      : view === 'payment-links'
        ? 'Payment links'
        : view === 'transactions'
          ? 'Transaction history'
          : view === 'downline'
            ? profile?.role === 'super_super_agent'
              ? 'Your team'
              : profile?.role === 'super_agent'
                ? 'Your agents'
                : 'Users you referred'
            : view === 'about'
              ? 'About us'
              : view === 'community'
                ? 'Community'
                : view === 'security' || view === 'identity'
                  ? ''
                  : 'Profile';

  return (
    <div className="account-hub">
      <header className="account-hub-toolbar">
        {view === 'hub' ? (
          <Link href="/dashboard" className="account-hub-icon-btn" aria-label="Back to home">
            <BackIcon />
          </Link>
        ) : (
          <button type="button" className="account-hub-icon-btn" aria-label="Back" onClick={goBack}>
            <BackIcon />
          </button>
        )}
        <span className="account-hub-toolbar-title">
          {view === 'hub' ? '' : hubTitle}
        </span>
        {view !== 'community' && view !== 'about' && view !== 'security' && view !== 'identity' && (
        <div className="account-hub-toolbar-actions">
          <button type="button" className="account-hub-icon-btn" aria-label="Support" title="Support">
            <SupportIcon />
          </button>
          <button
            type="button"
            className="account-hub-icon-btn"
            aria-label="Account settings"
            onClick={() => setView('profile')}
          >
            <SettingsIcon />
          </button>
        </div>
        )}
        {(view === 'community' || view === 'about' || view === 'security' || view === 'identity') && (
          <div className="account-hub-toolbar-spacer" aria-hidden />
        )}
      </header>

      {view === 'hub' && (
        <>
          <button type="button" className="account-profile-row" onClick={() => setView('profile')}>
            <ProfileAvatar
              userId={user.id}
              email={user.email}
              avatarUrl={profile?.avatar_url}
              size="sm"
              countryIso={resolveUserCountryIso(profile, user.phone)}
            />
            <div className="account-profile-meta">
              <div className="account-profile-email">{masked}</div>
              <div className="account-profile-uid">
                <span>UID: {uid}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="account-profile-copy"
                  aria-label="Copy UID"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyText('uid', uid);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      copyText('uid', uid);
                    }
                  }}
                >
                  <CopyIcon />
                </span>
                {copied === 'uid' && <span className="account-copied-hint">Copied</span>}
              </div>
              {idVerified ? (
                <span className="account-profile-badge account-profile-badge--verified">
                  <VerifiedCheckIcon />
                  Verified account
                </span>
              ) : (
                <span
                  role="button"
                  tabIndex={0}
                  className={`account-profile-badge account-profile-badge--kyc account-profile-badge--clickable${idPartial ? ' account-profile-badge--kyc-partial' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setView('identity');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setView('identity');
                    }
                  }}
                >
                  {idPartial ? 'ID verification incomplete' : 'Verify ID'}
                </span>
              )}
            </div>
            <ChevronRightIcon />
          </button>

          {profileReady && (
            <div className="account-hub-footer">
              <Link href="/dashboard/buy" className="account-buy-crypto-card">
                <span className="account-buy-crypto-icon" aria-hidden>
                  <BuyCryptoIcon />
                </span>
                <span className="account-buy-crypto-copy">
                  <span className="account-buy-crypto-title">Buy crypto</span>
                  <span className="account-buy-crypto-sub">BTC, ETH, USDT & more</span>
                </span>
                <ChevronRightIcon />
              </Link>

              {canSeeAffiliation && <AccountInviteCard />}
            </div>
          )}

          <nav className="account-menu" aria-label="Account menu" aria-busy={!profileReady}>
            {!profileReady ? (
              <>
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="account-menu-skeleton" aria-hidden />
                ))}
              </>
            ) : (
              <>
            <AccountMenuRow
              icon={<LockIcon />}
              label="Security"
              onClick={() => setView('security')}
            />
            {canSeeAffiliation && (
              <AccountMenuRow
                icon={<UsersIcon />}
                label="Affiliation dashboard"
                onClick={() => router.push('/dashboard/affiliation')}
              />
            )}
            {isAdminOperatorEmail(user?.email) && (
              <AccountMenuLink icon={<ShieldIcon />} label="Admin" href="/dashboard/admin" />
            )}
            <AccountMenuRow
              icon={<CommunityIcon />}
              label="Community"
              onClick={() => setView('community')}
            />
            <AccountMenuRow
              icon={<InfoIcon />}
              label="About us"
              trailing={`V${APP_VERSION}`}
              onClick={() => setView('about')}
            />
              </>
            )}
          </nav>
        </>
      )}

      {view === 'profile' && (
        <div className="account-subview">
          <div className="account-profile-hero">
            <ProfileAvatar
              userId={user.id}
              email={user.email}
              avatarUrl={profile?.avatar_url}
              size="lg"
              editable
              onAvatarChange={handleAvatarChange}
            />
            <p className="account-profile-hero-email">{masked}</p>
          </div>
          <div className="account-info-card">
            <div className="account-info-row">
              <span className="account-info-label">UID</span>
              <span className="account-info-value">
                {uid}
                <button type="button" className="account-info-action" aria-label="Copy UID" onClick={() => copyText('uid-profile', uid)}>
                  <CopyIcon />
                </button>
                {copied === 'uid-profile' && <span className="account-copied-inline">Copied</span>}
              </span>
            </div>
            <div className="account-info-row account-info-row--kyc">
              <span className="account-info-label">Identity</span>
              <span className="account-info-value">
                {idVerified ? (
                  <span className="account-kyc-verified">
                    <VerifiedCheckIcon />
                    Verified account
                  </span>
                ) : (
                  <button type="button" className="account-kyc-upload" onClick={() => setIdModalOpen(true)}>
                    {idPartial ? 'Continue ID upload' : 'Upload passport / ID'}
                  </button>
                )}
              </span>
            </div>
            <div className="account-info-row">
              <span className="account-info-label">Email</span>
              <span className="account-info-value account-info-value--muted">{user.email}</span>
            </div>
            <div className="account-info-row account-info-row--last">
              <span className="account-info-label">Account type</span>
              <span className="account-info-pill">{roleLabel(profile?.role)}</span>
            </div>
          </div>

          <button type="button" className="account-logout-btn" onClick={handleLogout}>
            Log out
          </button>

          <IdVerificationModal
            open={idModalOpen}
            onClose={() => setIdModalOpen(false)}
            userId={user.id}
            onComplete={(result) => {
              handleIdUploaded(result);
              setIdModalOpen(false);
            }}
          />
        </div>
      )}

      {view === 'payment-links' && canManagePaymentLinks && !isAgentLike && (
        <div className="account-subview">
          <p className="account-subview-lead">
            Create a fixed-amount link: anyone can open it and pay in one tap (no sign-in). Funds credit your in-app wallet.
          </p>
          <div className="account-panel">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user?.id) return;
                setPlLoading(true);
                setPlMessage('');
                const n = Number(plAmount);
                if (!plAmount.trim() || Number.isNaN(n) || n <= 0) {
                  setPlMessage('Enter an amount greater than 0.');
                  setPlLoading(false);
                  return;
                }
                try {
                  const body = { currency: plCurrency, amount: n, title: plTitle.trim() || undefined };
                  await createPaymentLink(user.id, body, token);
                  setPlTitle('');
                  setPlAmount('');
                  setPlMessage('Link created.');
                  refreshPaymentLinks();
                } catch (err) {
                  setPlMessage(err?.message || 'Failed');
                } finally {
                  setPlLoading(false);
                }
              }}
            >
              <div className="form-group">
                <label className="form-label">Title (optional)</label>
                <input className="form-input account-input" value={plTitle} onChange={(e) => setPlTitle(e.target.value)} placeholder="e.g. Invoice #12" />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select account-input" value={plCurrency} onChange={(e) => setPlCurrency(e.target.value)}>
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                  <option value="ETH">ETH</option>
                  <option value="BTC">BTC</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  className="form-input account-input"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={plAmount}
                  onChange={(e) => setPlAmount(e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>
              {plMessage && <p className="account-form-msg">{plMessage}</p>}
              <button type="submit" className="account-primary-btn" disabled={plLoading}>
                {plLoading ? 'Creating…' : 'Create payment link'}
              </button>
            </form>
            {paymentLinks.length > 0 && (
              <div className="account-link-list">
                <h3 className="account-link-list-title">Your links</h3>
                {paymentLinks.map((pl) => (
                  <div key={pl.id} className="account-link-item">
                    <div className="account-link-item-head">
                      <strong>{pl.title || 'Payment request'}</strong>
                      <span>
                        {pl.currency}
                        {pl.amount != null && Number(pl.amount) > 0 ? ` · ${pl.amount}` : ' · any amount'}
                      </span>
                    </div>
                    <div className="account-link-copy-row">
                      <input readOnly className="account-link-url" value={siteUrl(`/pay/${pl.token}`)} />
                      <button
                        type="button"
                        className="account-secondary-btn"
                        onClick={() => copyText(`pl-${pl.id}`, siteUrl(`/pay/${pl.token}`))}
                      >
                        {copied === `pl-${pl.id}` ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'transactions' && (
        <div className="account-subview">
          <div className="account-panel account-panel--flush">
            {txLoading ? (
              <p className="account-empty">Loading…</p>
            ) : transactions.length === 0 ? (
              <p className="account-empty">No transactions yet.</p>
            ) : (
              <ul className="account-tx-list">
                {transactions.map((tx) => (
                  <li key={tx.id} className="account-tx-item">
                    <div className="account-tx-main">
                      <span className="account-tx-type">{tx.description || tx.type}</span>
                      <span className={`account-tx-amount ${tx.direction === 'in' ? 'account-tx-amount--in' : ''}`}>
                        {tx.direction === 'in' ? '+' : '−'}
                        {formatAmount(tx.amount, tx.currency)} {tx.currency}
                      </span>
                    </div>
                    <div className="account-tx-meta">
                      {new Date(tx.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {view === 'downline' && isAgentLike && (
        <div className="account-subview">
          <p className="account-subview-lead">
            {profile?.role === 'super_super_agent'
              ? 'Super agents (and any legacy agents) who signed up with your invite link.'
              : profile?.role === 'super_agent'
                ? 'Agents who signed up with your super-agent invite link.'
                : 'Regular users who joined with your invite link.'}
          </p>
          <div className="account-panel account-panel--flush">
            {downlineLoading ? (
              <p className="account-empty">Loading…</p>
            ) : !downline?.members?.length ? (
              <p className="account-empty">No one yet.</p>
            ) : (
              <ul className="account-member-list">
                {downline.members.map((m) => (
                  <li key={m.id} className="account-member-item">
                    <div className="account-member-email">{m.email || '—'}</div>
                    <div className="account-member-meta">
                      {m.display_name || m.username || '—'}
                      {profile?.role === 'super_super_agent' && (
                        <> · {m.role === 'super_agent' ? 'Super agent' : m.role === 'agent' ? 'Agent' : m.role || '—'}</>
                      )}
                    </div>
                    {m.created_at && (
                      <div className="account-member-date">
                        Joined {new Date(m.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {view === 'community' && <AccountCommunity />}

      {view === 'security' && (
        <AccountSecurity
          email={user.email}
          phone={user.phone}
          profile={profile}
          onOpenIdentity={() => setView('identity')}
          onQuickPinSaved={(setAt) => {
            setProfile((p) => ({
              ...(p || {}),
              security_pin_set_at: setAt,
            }));
            if (!setAt && user?.id) clearPinUnlocked(user.id);
          }}
          onPhoneVerified={async (verifiedPhone) => {
            const supabase = createClient();
            const { data: { user: u } } = await supabase.auth.getUser();
            if (u) {
              setUser({ ...u, phone: verifiedPhone || null });
            }
          }}
        />
      )}

      {view === 'identity' && (
        <IdDocumentUpload
          userId={user.id}
          email={user.email}
          uid={uid}
          documentPath={profile?.id_document_path}
          documentBackPath={profile?.id_document_back_path}
          uploadedAt={profile?.id_document_uploaded_at}
          onUploaded={handleIdUploaded}
        />
      )}

      {view === 'about' && (
        <AccountAbout
          version={APP_VERSION}
          npsScore={profile?.nps_score ?? null}
          onNpsSaved={(score) =>
            setProfile((p) => ({
              ...p,
              nps_score: score,
              nps_submitted_at: new Date().toISOString(),
            }))
          }
        />
      )}
    </div>
  );
}

function AccountMenuRow({ icon, label, trailing, onClick }) {
  return (
    <button type="button" className="account-menu-row" onClick={onClick}>
      <span className="account-menu-icon">{icon}</span>
      <span className="account-menu-label">{label}</span>
      {trailing && <span className="account-menu-trailing">{trailing}</span>}
      <ChevronRightIcon />
    </button>
  );
}

function AccountMenuLink({ icon, label, href, trailing }) {
  return (
    <Link href={href} className="account-menu-row account-menu-row--link">
      <span className="account-menu-icon">{icon}</span>
      <span className="account-menu-label">{label}</span>
      {trailing && <span className="account-menu-trailing">{trailing}</span>}
      <ChevronRightIcon />
    </Link>
  );
}

function VerifiedCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BuyCryptoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" strokeLinecap="round" />
      <path d="M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3v-6z" />
      <path d="M21 11h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v-6z" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="account-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M14.5 17.5c.5-1.5 1.8-2.5 3.5-2.5 1.2 0 2.2.4 3 1.1" />
    </svg>
  );
}
