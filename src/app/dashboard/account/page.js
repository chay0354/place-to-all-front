'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getTransactions, getProfile, getProfileDownline, createPaymentLink, listPaymentLinks } from '@/lib/api';
import { isAdminOperatorEmail } from '@/lib/admin-config';
import { siteUrl } from '@/lib/site-url';

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [plTitle, setPlTitle] = useState('');
  const [plCurrency, setPlCurrency] = useState('USDT');
  const [plAmount, setPlAmount] = useState('');
  const [plLoading, setPlLoading] = useState(false);
  const [plMessage, setPlMessage] = useState('');
  const [downline, setDownline] = useState(null);
  const [downlineLoading, setDownlineLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setLoading(false);
      if (!u) router.push('/login');
    });
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token));
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;
    setTxLoading(true);
    getTransactions(user.id, token)
      .then((list) => setTransactions(Array.isArray(list) ? list : []))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [user?.id, token]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getProfile()
      .then((p) => {
        if (!cancelled) setProfile(p || {});
      })
      .catch(() => {
        if (!cancelled) setProfile({ role: 'regular' });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
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
  }, [profile?.role]);

  const isAgentLike =
    profile?.role === 'agent' || profile?.role === 'super_agent' || profile?.role === 'super_super_agent';

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
    if (canManagePaymentLinks && user?.id && token) refreshPaymentLinks();
  }, [canManagePaymentLinks, user?.id, token]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function formatAmount(amount, currency) {
    const n = Number(amount);
    if (currency === 'USDT' || currency === 'USDC') return n.toFixed(2);
    if (n >= 1) return n.toFixed(4);
    if (n >= 0.0001) return n.toFixed(6);
    return n.toFixed(8);
  }

  if (loading || !user) return null;

  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">← Back to portfolio</Link>
      <h1 className="page-title">Account</h1>

      <div className="card card-lg">
        <div className="form-group">
          <label className="form-label">Email</label>
          <p className="form-input" style={{ background: 'var(--bg-muted)', cursor: 'default' }}>
            {user.email}
          </p>
        </div>
        {user.created_at && (
          <div className="form-group">
            <label className="form-label">Member since</label>
            <p className="form-input" style={{ background: 'var(--bg-muted)', cursor: 'default' }}>
              {new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </p>
          </div>
        )}
        <div style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Log out
          </button>
        </div>
      </div>

      <h2 className="page-title" style={{ marginTop: '2rem', fontSize: '1.25rem' }}>Card center</h2>
      <div className="card card-lg">
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
          Issue your Place to All virtual Visa card, fund it from crypto wallets, and prepare it for Apple Pay / Google Pay.
        </p>
        <Link
          href="/dashboard/card"
          className="btn btn-primary"
          style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none', width: '100%' }}
        >
          Open card center
        </Link>
      </div>

      {isAdminOperatorEmail(user?.email) && (
        <>
          <h2 className="page-title" style={{ marginTop: '2rem', fontSize: '1.25rem' }}>Admin</h2>
          <div className="card card-lg">
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
              View agents, super agents, and super super agents; promote <strong>agents</strong> to <strong>super agent</strong>, and <strong>super agents</strong> to <strong>super super agent</strong>, only when they have no invited users. (Operator account only.)
            </p>
            <Link href="/dashboard/admin" className="btn btn-primary" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none', width: '100%' }}>
              Open admin menu
            </Link>
          </div>
        </>
      )}

      {isAgentLike && (
        <>
          <h2 className="page-title" style={{ marginTop: '2rem', fontSize: '1.25rem' }}>Invite link</h2>
          <div className="card card-lg">
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
              {profile?.role === 'super_super_agent' ? (
                <>
                  Share this link to recruit <strong>super agents</strong> under you (they sign up as super agent — no self-serve choice). Same tools for you: referral link effects, payment links. You earn the usual super-tier <strong>4%</strong> where it applies, <strong>plus an additional 4%</strong> when you qualify as the super-super upline in the buyer’s chain (paid by the buyer).
                </>
              ) : profile?.role === 'super_agent' ? (
                <>
                  Share this link to recruit <strong>agents</strong> under you. They get the same agent tools (referral link for regular signups, payment links). You earn an extra <strong>4%</strong> on qualifying crypto buys they make and on buys by users they refer (on top of the <strong>4%</strong> direct affiliate on those buys). All fee portions are taken from the buyer’s side of each purchase.
                </>
              ) : (
                <>
                  Share this invite link. When someone signs up through it, they join as a <strong>regular</strong> user. You earn <strong>4%</strong> of each crypto purchase they make (direct affiliate). If your account sits under a super agent, they also earn <strong>4%</strong> on those buys; a <strong>super super agent</strong> above may earn another <strong>4%</strong>; the platform admin fee is <strong>4%</strong> — up to <strong>16%</strong> total from the buyer’s gross on a full chain.
                </>
              )}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={siteUrl(`/register?ref=${user.id}`)}
                className="form-input"
                style={{ flex: '1', minWidth: 200, fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  const url = siteUrl(`/register?ref=${user.id}`);
                  try {
                    await navigator.clipboard.writeText(url);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2000);
                  } catch (_) {}
                }}
              >
                {inviteCopied ? 'Copied!' : 'Copy invite link'}
              </button>
            </div>
          </div>
        </>
      )}

      {canManagePaymentLinks && (
        <>
          <h2 className="page-title" style={{ marginTop: '2rem', fontSize: '1.25rem' }}>Payment links</h2>
          <div className="card card-lg">
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
              Create a fixed-amount link: anyone can open it and pay in one tap (no sign-in). Funds credit your in-app wallet; older links are retired when you create a new one.
            </p>
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
                <input className="form-input" value={plTitle} onChange={(e) => setPlTitle(e.target.value)} placeholder="e.g. Invoice #12" />
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
                  value={plAmount}
                  onChange={(e) => setPlAmount(e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>
              {plMessage && <p style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>{plMessage}</p>}
              <button type="submit" className="btn btn-primary" disabled={plLoading}>
                {plLoading ? 'Creating…' : 'Create payment link'}
              </button>
            </form>
            {paymentLinks.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Your links</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {paymentLinks.map((pl) => (
                    <li key={pl.id} style={{ padding: '0.75rem', background: 'var(--bg-muted)', borderRadius: 8, fontSize: '0.875rem' }}>
                      <div style={{ fontWeight: 600 }}>{pl.title || 'Payment request'}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{pl.currency}{pl.amount != null && Number(pl.amount) > 0 ? ` · ${pl.amount}` : ' · any amount'}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                          readOnly
                          className="form-input"
                          style={{ flex: 1, minWidth: 180, fontFamily: 'monospace', fontSize: '0.75rem' }}
                          value={siteUrl(`/pay/${pl.token}`)}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost"
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
          </div>
        </>
      )}

      <h2 className="page-title" style={{ marginTop: '2rem', fontSize: '1.25rem' }}>Transaction history</h2>
      <div className="card card-lg">
        {txLoading ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Loading…</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No transactions yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="form-input" style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-muted)', borderRadius: 8 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Currency</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Direction</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(tx.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{tx.description || tx.type}</td>
                    <td style={{ padding: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                      {formatAmount(tx.amount, tx.currency)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{tx.currency}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ color: tx.direction === 'in' ? 'var(--success, green)' : 'var(--text-muted)' }}>
                        {tx.direction === 'in' ? 'In' : 'Out'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAgentLike && (
        <>
          <h2 className="page-title" style={{ marginTop: '2rem', fontSize: '1.25rem' }}>
            {profile?.role === 'super_super_agent'
              ? 'Your team'
              : profile?.role === 'super_agent'
                ? 'Your agents'
                : 'Users you referred'}
          </h2>
          <div className="card card-lg">
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
              {profile?.role === 'super_super_agent'
                ? 'Super agents (and any legacy agents) who signed up with your invite link.'
                : profile?.role === 'super_agent'
                  ? 'Agents who signed up with your super-agent invite link.'
                  : 'Regular users who joined with your invite link.'}
            </p>
            {downlineLoading ? (
              <p style={{ color: 'var(--text-muted)', padding: '0.5rem 0' }}>Loading…</p>
            ) : !downline?.members?.length ? (
              <p style={{ color: 'var(--text-muted)', padding: '0.5rem 0' }}>No one yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  className="form-input"
                  style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-muted)', borderRadius: 8 }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '0.75rem', fontWeight: 600 }}>Name</th>
                      {profile?.role === 'super_super_agent' && (
                        <th style={{ padding: '0.75rem', fontWeight: 600 }}>Role</th>
                      )}
                      <th style={{ padding: '0.75rem', fontWeight: 600 }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downline.members.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{m.email || '—'}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {m.display_name || m.username || '—'}
                        </td>
                        {profile?.role === 'super_super_agent' && (
                          <td style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                            {m.role === 'super_agent' ? 'Super agent' : m.role === 'agent' ? 'Agent' : m.role || '—'}
                          </td>
                        )}
                        <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                          {m.created_at ? new Date(m.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
