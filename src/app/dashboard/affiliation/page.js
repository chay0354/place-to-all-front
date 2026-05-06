'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  getProfile,
  getAffiliationDashboard,
  getAffiliationFees,
  patchAffiliationFees,
  createPaymentLink,
  listPaymentLinks,
} from '@/lib/api';
import { siteUrl } from '@/lib/site-url';

const AGENT_ROLES = new Set(['agent', 'super_agent', 'super_super_agent']);

function roleLabel(role) {
  if (role === 'super_super_agent') return 'Super super agent';
  if (role === 'super_agent') return 'Super agent';
  if (role === 'agent') return 'Agent';
  if (role === 'regular') return 'Regular';
  return role || '—';
}

function shortDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function truncateMiddle(s, left = 14, right = 10) {
  const t = String(s || '');
  if (t.length <= left + right + 3) return t;
  return `${t.slice(0, left)}…${t.slice(-right)}`;
}

export default function AffiliationDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inviteCopied, setInviteCopied] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [latestPaymentUrl, setLatestPaymentUrl] = useState('');
  const [plTitle, setPlTitle] = useState('');
  const [plCurrency, setPlCurrency] = useState('USDT');
  const [plAmount, setPlAmount] = useState('');
  const [plLoading, setPlLoading] = useState(false);
  const [plMessage, setPlMessage] = useState('');
  const [paymentLinks, setPaymentLinks] = useState([]);

  const [downline, setDownline] = useState({ kind: 'none', members: [] });
  const [downlineLoading, setDownlineLoading] = useState(false);
  const [feeSettings, setFeeSettings] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState('');
  const debounceTimers = useRef({});

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: { user: u } }, { data: { session } }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);
      setUser(u);
      setToken(session?.access_token || null);
      if (!u) {
        router.replace('/login?next=/dashboard/affiliation');
        return;
      }
      try {
        const p = await getProfile();
        setProfile(p || { role: 'regular' });
      } catch {
        setProfile({ role: 'regular' });
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const isAgentLike = useMemo(() => AGENT_ROLES.has(profile?.role), [profile?.role]);

  useEffect(() => {
    if (!isAgentLike) return;
    setDownlineLoading(true);
    setError('');
    getAffiliationDashboard()
      .then((data) => setDownline(data && typeof data === 'object' ? data : { kind: 'none', members: [] }))
      .catch((e) => {
        setError(e?.message || 'Failed to load affiliation data');
        setDownline({ kind: 'none', members: [] });
      })
      .finally(() => setDownlineLoading(false));
  }, [isAgentLike]);

  useEffect(() => {
    if (!isAgentLike) return;
    setFeeLoading(true);
    setFeeError('');
    getAffiliationFees()
      .then((data) => setFeeSettings(data))
      .catch((e) => setFeeError(e?.message || 'Could not load fee settings'))
      .finally(() => setFeeLoading(false));
  }, [isAgentLike]);

  const refreshPaymentLinks = useCallback(() => {
    if (!user?.id || !token) return;
    listPaymentLinks(user.id, token)
      .then((list) => setPaymentLinks(Array.isArray(list) ? list : []))
      .catch(() => setPaymentLinks([]));
  }, [user?.id, token]);

  useEffect(() => {
    if (!isAgentLike || !user?.id || !token) return;
    refreshPaymentLinks();
  }, [isAgentLike, user?.id, token, refreshPaymentLinks]);

  const schedulePatch = useCallback((key, fn, delay = 420) => {
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(fn, delay);
  }, []);

  const patchAffiliateTake = useCallback(
    (percent) => {
      schedulePatch('take', async () => {
        try {
          await patchAffiliationFees({ affiliateTakePercent: percent });
        } catch (e) {
          setFeeError(e?.message || 'Save failed');
        }
      });
    },
    [schedulePatch],
  );

  const members = useMemo(
    () => (Array.isArray(downline?.members) ? downline.members : []),
    [downline?.members],
  );

  const feesByMember = useMemo(() => {
    return members.reduce((acc, m) => {
      const flows = Array.isArray(m.fee_flows) ? m.fee_flows : [];
      acc[m.id] = {
        total: flows.reduce((sum, f) => sum + (Number(f.amount) || 0), 0),
        toMe: flows.reduce((sum, f) => (f?.receiver?.id === user?.id ? sum + (Number(f.amount) || 0) : sum), 0),
      };
      return acc;
    }, {});
  }, [members, user?.id]);

  const txRows = useMemo(
    () =>
      members.flatMap((m) =>
        (m.transactions || []).map((tx) => ({
          ...tx,
          memberId: m.id,
          memberEmail: m.email || m.display_name || m.username || 'Unknown user',
          memberRole: m.role,
          feeCollectedToMe: feesByMember[m.id]?.toMe || 0,
          totalFee: feesByMember[m.id]?.total || 0,
        })),
      ),
    [members, feesByMember],
  );

  const invitedUsersTxTotal = useMemo(
    () => txRows.reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0),
    [txRows],
  );

  const feesCollectedByYou = useMemo(
    () =>
      members
        .flatMap((m) => m.fee_flows || [])
        .reduce((sum, row) => (row?.receiver?.id === user?.id ? sum + (Number(row.amount) || 0) : sum), 0),
    [members, user?.id],
  );

  const totalAgents = members.length;

  const tableRows = useMemo(
    () => [...txRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [txRows],
  );

  if (loading) return null;
  if (!user) return null;

  if (!isAgentLike) {
    return (
      <div className="aff-page aff-page--simple">
        <Link href="/dashboard/account" className="aff-back-link">
          ← Account
        </Link>
        <h1 className="page-title" style={{ marginTop: '1rem' }}>
          Affiliation
        </h1>
        <div className="aff-empty-card">
          <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            This area is for <strong>agent</strong>, <strong>super agent</strong>, and{' '}
            <strong>super super agent</strong> accounts.
          </p>
        </div>
      </div>
    );
  }

  const inviteUrl = siteUrl(`/register?ref=${user.id}`);
  const hierarchyNote = feeSettings?.hierarchyNote || '';
  const maxTake = feeSettings?.maxAffiliateTakePercent ?? 6;
  const affiliateTakeEffective =
    feeSettings?.affiliateTakePercent != null && !Number.isNaN(Number(feeSettings.affiliateTakePercent))
      ? Number(feeSettings.affiliateTakePercent)
      : 4;

  return (
    <div className="aff-page">
      <header className="aff-mobile-header">
        <div>
          <p className="aff-kicker">Network</p>
          <h1 className="aff-title">Affiliation</h1>
        </div>
        <Link href="/dashboard/account" className="aff-back-link" aria-label="Back to account">
          Account
        </Link>
      </header>

      <section className="aff-stat-grid" aria-label="Summary">
        <div className="aff-stat-card blue">
          <p>Downline volume</p>
          <strong>${invitedUsersTxTotal.toFixed(2)}</strong>
        </div>
        <div className="aff-stat-card green">
          <p>Fees to you</p>
          <strong>${feesCollectedByYou.toFixed(2)}</strong>
        </div>
        <div className="aff-stat-card amber">
          <p>Max your take</p>
          <strong>{maxTake}%</strong>
        </div>
        <div className="aff-stat-card red">
          <p>
            People
            {profile?.role === 'super_agent' || profile?.role === 'super_super_agent' ? (
              <span className="aff-stat-sub"> (full referral tree)</span>
            ) : null}
          </p>
          <strong>{totalAgents}</strong>
        </div>
      </section>

      <section className="aff-inline-panel" aria-label="Invite link">
        <h2 className="aff-section-title">Invite link</h2>
        <div className="aff-copy-row">
          <input
            type="text"
            readOnly
            className="form-input aff-copy-input"
            value={inviteUrl}
            aria-label="Invite URL"
          />
          <button
            type="button"
            className="btn btn-primary aff-copy-btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(inviteUrl);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2000);
              } catch {
                /* ignore */
              }
            }}
          >
            {inviteCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      <section className="aff-inline-panel" aria-label="Payment links">
        <h2 className="aff-section-title">Payment links</h2>
        <form
          className="aff-payment-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user?.id) return;
            const n = Number(plAmount);
            if (!plAmount.trim() || Number.isNaN(n) || n <= 0) {
              setPlMessage('Enter an amount greater than 0.');
              return;
            }
            setPlLoading(true);
            setPlMessage('');
            try {
              const created = await createPaymentLink(
                user.id,
                { title: plTitle.trim() || undefined, currency: plCurrency, amount: n },
                token,
              );
              setPlTitle('');
              setPlAmount('');
              if (created?.token) {
                setLatestPaymentUrl(siteUrl(`/pay/${created.token}`));
              }
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
            <input
              className="form-input"
              placeholder="e.g. Invoice #12"
              value={plTitle}
              onChange={(e) => setPlTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select className="form-select" value={plCurrency} onChange={(e) => setPlCurrency(e.target.value)}>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="ETH">ETH</option>
              <option value="BTC">BTC</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input
              className="form-input"
              type="number"
              step="any"
              min="0"
              required
              placeholder="e.g. 50"
              value={plAmount}
              onChange={(e) => setPlAmount(e.target.value)}
            />
          </div>
          {plMessage && <p className="aff-message">{plMessage}</p>}
          {latestPaymentUrl && (
            <p className="aff-message aff-break-all" style={{ padding: '0 0 0.75rem' }}>
              Latest: {latestPaymentUrl}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={plLoading}>
            {plLoading ? 'Creating…' : 'Create payment link'}
          </button>
        </form>

        {paymentLinks.length > 0 && (
          <div className="aff-payment-list-wrap">
            <h3 className="aff-subtitle" style={{ marginTop: '1.25rem' }}>
              Your links
            </h3>
            <ul className="aff-payment-link-list">
              {paymentLinks.map((pl) => (
                <li key={pl.id} className="aff-payment-link-item">
                  <div className="aff-payment-link-title">{pl.title || 'Payment request'}</div>
                  <div className="aff-payment-link-meta">
                    {pl.currency}
                    {pl.amount != null && Number(pl.amount) > 0 ? ` · ${pl.amount}` : ' · any amount'}
                  </div>
                  <div className="aff-copy-row aff-copy-row--tight">
                    <input
                      readOnly
                      className="form-input aff-copy-input"
                      value={siteUrl(`/pay/${pl.token}`)}
                      aria-label="Payment URL"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost aff-copy-btn"
                      onClick={() => navigator.clipboard.writeText(siteUrl(`/pay/${pl.token}`))}
                    >
                      Copy
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <details className="aff-details aff-info-details">
        <summary>How fees work in your role</summary>
        <p className="aff-details-body">{hierarchyNote}</p>
        <ul className="aff-tier-list">
          <li>
            <span className="aff-tier-badge">Platform</span> 4% on qualifying buys (fixed).
          </li>
          <li>
            <span className="aff-tier-badge">Your tier</span> One setting (0–{maxTake}%) applies to the affiliate
            commission your account earns — direct recruiter, super-agent, or super-super tier, depending on role and
            chain.
          </li>
          <li>
            <span className="aff-tier-badge">Default</span> 4% if you do not change the slider.
          </li>
        </ul>
      </details>

      <section className="aff-fee-panel" aria-busy={feeLoading}>
        <div className="aff-fee-panel-head">
          <h2 className="aff-section-title">Your commission take</h2>
        </div>
        {feeError && <p className="aff-message aff-error">{feeError}</p>}
        {feeLoading && <p className="aff-message">Loading fee settings…</p>}

        {!feeLoading && (
          <div className="aff-fee-stack">
            <div className="aff-fee-row aff-fee-row--single">
              <div className="aff-fee-row-text">
                <strong>Take from qualifying buys</strong>
                <span className="aff-fee-pct">{Number(affiliateTakeEffective).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                className="aff-range"
                min={0}
                max={maxTake}
                step={0.1}
                value={affiliateTakeEffective}
                aria-label="Affiliate commission percent"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFeeSettings((prev) => ({ ...prev, affiliateTakePercent: v }));
                  patchAffiliateTake(v);
                }}
              />
            </div>
          </div>
        )}
      </section>

      <section className="aff-tools-row" aria-label="Quick actions">
        <button type="button" className="aff-tool-chip aff-tool-chip--accent" onClick={() => setUsersOpen(true)}>
          Your network ({totalAgents})
        </button>
      </section>

      {error && <p className="aff-message aff-error">{error}</p>}

      <section className="aff-tx-section">
        <h2 className="aff-section-title">Recent activity</h2>
        {downlineLoading ? (
          <p className="aff-message">Loading…</p>
        ) : !tableRows.length ? (
          <div className="aff-empty-card">No transactions yet.</div>
        ) : (
          <ul className="aff-tx-list">
            {tableRows.slice(0, 40).map((row) => {
              const amount = Number(row.amount) || 0;
              const fromLabel =
                row?.from_user?.email ||
                row?.from_user?.display_name ||
                (row.direction === 'in' ? 'External / System' : row.memberEmail);
              const toLabel =
                row?.to_user?.email ||
                row?.to_user?.display_name ||
                (row.direction === 'in' ? row.memberEmail : 'External / System');
              return (
                <li key={row.id} className="aff-tx-card">
                  <div className="aff-tx-card-top">
                    <span className="aff-tx-date">{shortDate(row.created_at)}</span>
                    <span className="aff-tx-amount">
                      ${amount.toFixed(2)} <small>{row.currency || ''}</small>
                    </span>
                  </div>
                  <div className="aff-tx-flow">
                    <span title={fromLabel}>{truncateMiddle(fromLabel, 18, 8)}</span>
                    <span className="aff-tx-arrow">→</span>
                    <span title={toLabel}>{truncateMiddle(toLabel, 18, 8)}</span>
                  </div>
                  <div className="aff-tx-meta">
                    <span>Fee to you ${Number(row.feeCollectedToMe || 0).toFixed(2)}</span>
                    <span>Total fees ${Number(row.totalFee || 0).toFixed(2)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {usersOpen && (
        <div className="modal-overlay" role="presentation" onClick={() => setUsersOpen(false)}>
          <div className="modal aff-modal aff-modal--wide" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Your network</h3>
            {!members.length ? (
              <p className="form-hint">No one here yet.</p>
            ) : (
              <ul className="aff-user-list">
                {members.map((m) => (
                  <li key={m.id} className="aff-user-card">
                    <div>
                      <strong>{m.email || m.display_name || m.username || '—'}</strong>
                      <span className="aff-user-role">{roleLabel(m.role)}</span>
                    </div>
                    <span className="aff-user-date">{shortDate(m.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setUsersOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
