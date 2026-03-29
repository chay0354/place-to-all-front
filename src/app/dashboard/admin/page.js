'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  adminListAgents,
  adminPromoteToSuperAgent,
  adminPromoteToSuperSuperAgent,
  adminListRegularUsers,
} from '@/lib/api';
import { isAdminOperatorEmail, ADMIN_OPERATOR_EMAIL } from '@/lib/admin-config';

const tableWrap = {
  overflow: 'auto',
  maxHeight: 'min(70vh, 640px)',
  border: '1px solid var(--border, #30363d)',
  borderRadius: 8,
  WebkitOverflowScrolling: 'touch',
};

const thStyle = {
  padding: '0.65rem 0.75rem',
  fontWeight: 600,
  fontSize: '0.8125rem',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border, #30363d)',
  background: 'var(--bg-muted)',
  position: 'sticky',
  top: 0,
  zIndex: 1,
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '0.55rem 0.75rem',
  borderBottom: '1px solid var(--border, #30363d)',
  fontSize: '0.875rem',
  verticalAlign: 'middle',
};

const subTh = { ...thStyle, position: 'static', background: 'var(--dash-card-hover, #21262d)' };

function AgentsUnderSuperTable({ agents }) {
  if (!agents.length) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>No agents under this super agent.</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', minWidth: 560 }}>
        <thead>
          <tr>
            <th style={subTh}>Email</th>
            <th style={subTh}>Name</th>
            <th style={{ ...subTh, minWidth: 200 }}>User ID</th>
            <th style={{ ...subTh, textAlign: 'right' }}>Users under agent</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((ag, j) => (
            <tr key={ag.id} style={{ background: j % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
              <td style={tdStyle}>{ag.email || '—'}</td>
              <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{ag.display_name || ag.username || '—'}</td>
              <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>{ag.id}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Number(ag.invitedCount) || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegularUsersUnderAgentTable({ users }) {
  if (!users.length) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>No regular users under this agent.</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', minWidth: 520 }}>
        <thead>
          <tr>
            <th style={subTh}>Email</th>
            <th style={subTh}>Name</th>
            <th style={{ ...subTh, minWidth: 200 }}>User ID</th>
            <th style={subTh}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, j) => (
            <tr key={u.id} style={{ background: j % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
              <td style={tdStyle}>{u.email || '—'}</td>
              <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{u.display_name || u.username || '—'}</td>
              <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>{u.id}</td>
              <td style={tdStyle}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [rows, setRows] = useState([]);
  const [regularUsers, setRegularUsers] = useState([]);
  const [listError, setListError] = useState('');
  const [regularError, setRegularError] = useState('');
  const [actionId, setActionId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: { user: u } }, { data: { session } }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);
      setUser(u);
      setToken(session?.access_token);
      if (!u) {
        router.replace('/login?next=/dashboard/admin');
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;
    if (!isAdminOperatorEmail(user.email)) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setForbidden(false);
        setRegularError('');
        const [agentList, regList] = await Promise.all([
          adminListAgents(user.id, token),
          adminListRegularUsers(user.id, token).catch((e) => {
            if (!cancelled) setRegularError(e?.message || 'Failed to load regular users');
            return [];
          }),
        ]);
        if (!cancelled) {
          setRows(Array.isArray(agentList) ? agentList : []);
          setRegularUsers(Array.isArray(regList) ? regList : []);
        }
      } catch (e) {
        if (!cancelled) {
          setListError(e?.message || 'Failed to load list');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, token]);

  const agentsBySuperId = useMemo(() => {
    const m = {};
    for (const r of rows) {
      if (r.role !== 'agent' || !r.referred_by_id) continue;
      const k = r.referred_by_id;
      if (!m[k]) m[k] = [];
      m[k].push(r);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
    }
    return m;
  }, [rows]);

  const regularUsersByAgentId = useMemo(() => {
    const m = {};
    for (const u of regularUsers) {
      if (!u.referred_by_id) continue;
      const k = u.referred_by_id;
      if (!m[k]) m[k] = [];
      m[k].push(u);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
    }
    return m;
  }, [regularUsers]);

  async function promote(targetUserId) {
    if (!user?.id || !token) return;
    if (!window.confirm('Promote this user to super agent?')) return;
    setActionId(targetUserId);
    setActionMessage('');
    try {
      await adminPromoteToSuperAgent(user.id, targetUserId, token);
      setActionMessage('Promoted to super agent.');
      setRows((prev) =>
        prev.map((r) => (r.id === targetUserId ? { ...r, role: 'super_agent' } : r))
      );
    } catch (e) {
      setActionMessage(e?.message || 'Failed');
    } finally {
      setActionId(null);
    }
  }

  async function promoteToSuperSuper(targetUserId) {
    if (!user?.id || !token) return;
    if (!window.confirm('Promote this user to super super agent?')) return;
    setActionId(targetUserId);
    setActionMessage('');
    try {
      await adminPromoteToSuperSuperAgent(user.id, targetUserId, token);
      setActionMessage('Promoted to super super agent.');
      setRows((prev) =>
        prev.map((r) => (r.id === targetUserId ? { ...r, role: 'super_super_agent' } : r))
      );
    } catch (e) {
      setActionMessage(e?.message || 'Failed');
    } finally {
      setActionId(null);
    }
  }

  if (loading) return null;

  if (forbidden) {
    return (
      <div className="page">
        <Link href="/dashboard/account" className="back-link">← Back to account</Link>
        <h1 className="page-title">Admin</h1>
        <div className="card card-lg">
          <p style={{ color: 'var(--text-muted)' }}>
            Admin tools are only available when signed in as <strong>{ADMIN_OPERATOR_EMAIL}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const agents = rows.filter((r) => r.role === 'agent');
  const superAgents = rows.filter((r) => r.role === 'super_agent');
  const superSuperAgents = rows.filter((r) => r.role === 'super_super_agent');

  return (
    <div className="page">
      <Link href="/dashboard/account" className="back-link">← Back to account</Link>
      <h1 className="page-title">Admin menu</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
        Operator: <strong>{user?.email}</strong>. Super super / super agent sections list <strong>agents</strong> whose <code style={{ fontSize: '0.8em' }}>referred_by_id</code> is that user. Each agent row lists regular users they referred. Promote <strong>agent → super agent</strong> or <strong>super agent → super super agent</strong> only when that user has <strong>zero</strong> invited profiles.
      </p>

      {listError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{listError}</div>}
      {actionMessage && <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{actionMessage}</p>}

      <h2 className="page-title" style={{ marginTop: '1rem', fontSize: '1.1rem' }}>Super super agents ({superSuperAgents.length})</h2>
      <div className="card card-lg" style={{ marginBottom: '1.5rem' }}>
        {superSuperAgents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No super super agent accounts yet.</p>
        ) : (
          <div style={tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Name</th>
                  <th style={{ ...thStyle, minWidth: 200 }}>User ID</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 72 }}>Direct refs</th>
                  <th style={{ ...thStyle, width: 120 }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {superSuperAgents.map((a, i) => {
                  const invited = Number(a.invitedCount) || 0;
                  const rowBg = i % 2 === 0 ? 'transparent' : 'var(--bg-muted)';
                  const under = agentsBySuperId[a.id] ?? [];
                  return (
                    <Fragment key={a.id}>
                      <tr style={{ background: rowBg }}>
                        <td style={tdStyle}>{a.email || '—'}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{a.display_name || a.username || '—'}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{a.id}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{invited}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success, #3fb950)' }}>Super super</span>
                        </td>
                      </tr>
                      <tr style={{ background: 'var(--bg-muted)' }}>
                        <td colSpan={5} style={{ padding: '1rem', borderBottom: '1px solid var(--border, #30363d)' }}>
                          <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                            Agents under this super super agent ({under.length})
                          </div>
                          <AgentsUnderSuperTable agents={under} />
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="page-title" style={{ marginTop: '1rem', fontSize: '1.1rem' }}>Super agents ({superAgents.length})</h2>
      <div className="card card-lg" style={{ marginBottom: '1.5rem' }}>
        {superAgents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No super agent accounts yet.</p>
        ) : (
          <div style={tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Name</th>
                  <th style={{ ...thStyle, minWidth: 200 }}>User ID</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 72 }}>Direct refs</th>
                  <th style={{ ...thStyle, width: 90 }}>Role</th>
                  <th style={{ ...thStyle, width: 1 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {superAgents.map((a, i) => {
                  const invited = Number(a.invitedCount) || 0;
                  const canPromoteSuperSuper = invited === 0;
                  const rowBg = i % 2 === 0 ? 'transparent' : 'var(--bg-muted)';
                  const under = agentsBySuperId[a.id] ?? [];
                  return (
                    <Fragment key={a.id}>
                      <tr style={{ background: rowBg }}>
                        <td style={tdStyle}>{a.email || '—'}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{a.display_name || a.username || '—'}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{a.id}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{invited}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success, #3fb950)' }}>Super agent</span>
                        </td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                            disabled={actionId === a.id || !canPromoteSuperSuper}
                            title={!canPromoteSuperSuper ? 'Promote only when direct ref count is 0' : undefined}
                            onClick={() => promoteToSuperSuper(a.id)}
                          >
                            {actionId === a.id ? '…' : 'To super super'}
                          </button>
                        </td>
                      </tr>
                      <tr style={{ background: 'var(--bg-muted)' }}>
                        <td colSpan={6} style={{ padding: '1rem', borderBottom: '1px solid var(--border, #30363d)' }}>
                          <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                            Agents under this super agent ({under.length})
                          </div>
                          <AgentsUnderSuperTable agents={under} />
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="page-title" style={{ fontSize: '1.1rem' }}>Agents ({agents.length})</h2>
      <div className="card card-lg" style={{ marginBottom: '1.5rem' }}>
        {agents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No agent accounts.</p>
        ) : (
          <div style={tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Name</th>
                  <th style={{ ...thStyle, minWidth: 200 }}>User ID</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 72 }}>Invited</th>
                  <th style={{ ...thStyle, width: 100 }}>Eligible</th>
                  <th style={{ ...thStyle, width: 1 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a, i) => {
                  const invited = Number(a.invitedCount) || 0;
                  const canPromote = invited === 0;
                  const rowBg = i % 2 === 0 ? 'transparent' : 'var(--bg-muted)';
                  const usersUnder = regularUsersByAgentId[a.id] ?? [];
                  return (
                    <Fragment key={a.id}>
                      <tr style={{ background: rowBg }}>
                        <td style={tdStyle}>{a.email || '—'}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{a.display_name || a.username || '—'}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{a.id}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{invited}</td>
                        <td style={{ ...tdStyle, fontSize: '0.8125rem', color: canPromote ? 'var(--success, #3fb950)' : 'var(--text-muted)' }}>
                          {canPromote ? 'Yes' : `No (${invited})`}
                        </td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                            disabled={actionId === a.id || !canPromote}
                            title={!canPromote ? 'Promote only when invited count is 0' : undefined}
                            onClick={() => promote(a.id)}
                          >
                            {actionId === a.id ? '…' : 'Promote'}
                          </button>
                        </td>
                      </tr>
                      <tr style={{ background: 'var(--bg-muted)' }}>
                        <td colSpan={6} style={{ padding: '1rem', borderBottom: '1px solid var(--border, #30363d)' }}>
                          <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                            Regular users under this agent ({usersUnder.length})
                          </div>
                          <RegularUsersUnderAgentTable users={usersUnder} />
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="page-title" style={{ fontSize: '1.1rem' }}>Regular users ({regularUsers.length})</h2>
      <div className="card card-lg">
        {regularError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{regularError}</div>}
        {regularUsers.length === 0 && !regularError ? (
          <p style={{ color: 'var(--text-muted)' }}>No regular user accounts.</p>
        ) : regularUsers.length > 0 ? (
          <div style={tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Name</th>
                  <th style={{ ...thStyle, minWidth: 200 }}>User ID</th>
                  <th style={{ ...thStyle, minWidth: 200 }}>Referred by (user id)</th>
                  <th style={{ ...thStyle, width: 110 }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {regularUsers.map((u, i) => {
                  const rowBg = i % 2 === 0 ? 'transparent' : 'var(--bg-muted)';
                  return (
                    <tr key={u.id} style={{ background: rowBg }}>
                      <td style={tdStyle}>{u.email || '—'}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{u.display_name || u.username || '—'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{u.id}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                        {u.referred_by_id || '—'}
                      </td>
                      <td style={tdStyle}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
