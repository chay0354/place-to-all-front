'use client';

import { useState, useEffect, useMemo } from 'react';
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

const card = {
  border: '1px solid var(--border, #30363d)',
  borderRadius: 12,
  padding: '1rem',
  marginBottom: '0.75rem',
  background: 'var(--bg-muted, rgba(255,255,255,0.03))',
};

const nested = {
  marginTop: '0.75rem',
  paddingLeft: '0.5rem',
  borderLeft: '3px solid var(--border, #30363d)',
};

const labelMuted = { fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' };
const strong = { fontWeight: 600, fontSize: '0.9375rem', wordBreak: 'break-word' };

function CopyIdButton({ id }) {
  if (!id) return null;
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', marginTop: '0.35rem' }}
      onClick={() => navigator.clipboard.writeText(id).catch(() => {})}
    >
      Copy user ID
    </button>
  );
}

/** Agents recruited by a super / super-super (mobile-friendly cards). */
function AgentsRecruitedList({ agents, emptyLabel }) {
  if (!agents.length) {
    return <p style={{ ...labelMuted, margin: 0 }}>{emptyLabel}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {agents.map((ag) => {
        const n = Number(ag.invitedCount) || 0;
        return (
          <div key={ag.id} style={{ ...card, marginBottom: 0, padding: '0.85rem' }}>
            <div style={labelMuted}>Agent (used super’s invite link)</div>
            <div style={strong}>{ag.email || 'No email'}</div>
            {(ag.display_name || ag.username) && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {ag.display_name || ag.username}
              </div>
            )}
            <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Regular customers they invited: <strong style={{ color: 'var(--text, inherit)' }}>{n}</strong>
            </div>
            <CopyIdButton id={ag.id} />
          </div>
        );
      })}
    </div>
  );
}

/** Regular end-users under an agent. */
function RegularCustomersList({ users, emptyLabel }) {
  if (!users.length) {
    return <p style={{ ...labelMuted, margin: 0 }}>{emptyLabel}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {users.map((u) => (
        <div key={u.id} style={{ ...card, marginBottom: 0, padding: '0.85rem' }}>
          <div style={labelMuted}>Regular customer</div>
          <div style={strong}>{u.email || 'No email'}</div>
          {(u.display_name || u.username) && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {u.display_name || u.username}
            </div>
          )}
          <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
          </div>
          <CopyIdButton id={u.id} />
        </div>
      ))}
    </div>
  );
}

function RoleBadge({ children, variant }) {
  const color = variant === 'ss' ? '#a371f7' : 'var(--success, #3fb950)';
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.6875rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '0.2rem 0.5rem',
        borderRadius: 6,
        background: `${color}22`,
        color,
        marginBottom: '0.5rem',
      }}
    >
      {children}
    </span>
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

  const guideBox = {
    ...card,
    background: 'var(--bg-muted)',
    lineHeight: 1.55,
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  };

  return (
    <div className="page" style={{ paddingBottom: '2rem' }}>
      <Link href="/dashboard/account" className="back-link">← Back to account</Link>
      <h1 className="page-title">Admin</h1>

      <div style={guideBox}>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.65rem', fontSize: '0.9375rem' }}>
          How to read this screen
        </div>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li>
            <strong style={{ color: 'var(--text)' }}>Super super</strong> and <strong style={{ color: 'var(--text)' }}>super agents</strong> recruit other <strong style={{ color: 'var(--text)' }}>agents</strong> with their invite link. Under each person you’ll see those agents listed.
          </li>
          <li>
            <strong style={{ color: 'var(--text)' }}>Agents</strong> recruit <strong style={{ color: 'var(--text)' }}>regular customers</strong>. Open an agent card to see their customers.
          </li>
          <li>
            <strong style={{ color: 'var(--text)' }}>“Invite link count”</strong> = how many accounts signed up with that person’s link. <strong style={{ color: 'var(--text)' }}>Agent → super agent</strong> is allowed only when that count is <strong style={{ color: 'var(--text)' }}>0</strong>. <strong style={{ color: 'var(--text)' }}>Super agent → super super agent</strong> can be done anytime (supers usually already have agents on their link).
          </li>
        </ol>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem' }}>
          Signed in as <strong style={{ color: 'var(--text)' }}>{user?.email}</strong>
        </p>
      </div>

      {listError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{listError}</div>}
      {actionMessage && <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{actionMessage}</p>}

      <h2 className="page-title" style={{ marginTop: '1.25rem', fontSize: '1.05rem' }}>
        Super super agents ({superSuperAgents.length})
      </h2>
      <p style={{ ...labelMuted, marginTop: '-0.25rem', marginBottom: '0.75rem' }}>
        Top tier. Each card shows agents they brought in via invite link.
      </p>
      <div className="card card-lg" style={{ marginBottom: '1.25rem' }}>
        {superSuperAgents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>None yet — promote a super agent using the button in the Super agents section.</p>
        ) : (
          superSuperAgents.map((a) => {
            const invited = Number(a.invitedCount) || 0;
            const under = agentsBySuperId[a.id] ?? [];
            return (
              <div key={a.id} style={{ ...card, marginBottom: '1rem' }}>
                <RoleBadge variant="ss">Super super agent</RoleBadge>
                <div style={strong}>{a.email || 'No email'}</div>
                {(a.display_name || a.username) && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {a.display_name || a.username}
                  </div>
                )}
                <div style={{ fontSize: '0.875rem', marginTop: '0.65rem', color: 'var(--text-muted)' }}>
                  Invite link count:{' '}
                  <strong style={{ color: 'var(--text)' }}>{invited}</strong>
                  <span style={{ display: 'block', marginTop: 4, fontSize: '0.8125rem' }}>
                    (everyone who used this person’s invite link)
                  </span>
                </div>
                <CopyIdButton id={a.id} />
                <div style={nested}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Their agents ({under.length})
                  </div>
                  <AgentsRecruitedList
                    agents={under}
                    emptyLabel="No agents on their invite link yet."
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <h2 className="page-title" style={{ fontSize: '1.05rem' }}>
        Super agents ({superAgents.length})
      </h2>
      <p style={{ ...labelMuted, marginTop: '-0.25rem', marginBottom: '0.75rem' }}>
        Each card lists agents they recruited. Use the button to promote them to super super agent.
      </p>
      <div className="card card-lg" style={{ marginBottom: '1.25rem' }}>
        {superAgents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>None yet — promote a plain agent when their invite count is 0.</p>
        ) : (
          superAgents.map((a) => {
            const invited = Number(a.invitedCount) || 0;
            const under = agentsBySuperId[a.id] ?? [];
            return (
              <div key={a.id} style={{ ...card, marginBottom: '1rem' }}>
                <RoleBadge>Super agent</RoleBadge>
                <div style={strong}>{a.email || 'No email'}</div>
                {(a.display_name || a.username) && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {a.display_name || a.username}
                  </div>
                )}
                <div style={{ fontSize: '0.875rem', marginTop: '0.65rem', color: 'var(--text-muted)' }}>
                  Invite link count: <strong style={{ color: 'var(--text)' }}>{invited}</strong>
                </div>
                <CopyIdButton id={a.id} />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    marginTop: '0.75rem',
                    padding: '0.55rem 1rem',
                    fontSize: '0.875rem',
                  }}
                  disabled={actionId === a.id}
                  onClick={() => promoteToSuperSuper(a.id)}
                >
                  {actionId === a.id ? 'Working…' : 'Promote to super super agent'}
                </button>
                <div style={nested}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Their agents ({under.length})
                  </div>
                  <AgentsRecruitedList agents={under} emptyLabel="No agents on their invite link yet." />
                </div>
              </div>
            );
          })
        )}
      </div>

      <h2 className="page-title" style={{ fontSize: '1.05rem' }}>
        Agents ({agents.length})
      </h2>
      <p style={{ ...labelMuted, marginTop: '-0.25rem', marginBottom: '0.75rem' }}>
        People who can invite regular customers. Promote to super agent only if their invite link count is 0.
      </p>
      <div className="card card-lg" style={{ marginBottom: '1.25rem' }}>
        {agents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No agent accounts.</p>
        ) : (
          agents.map((a) => {
            const invited = Number(a.invitedCount) || 0;
            const canPromote = invited === 0;
            const usersUnder = regularUsersByAgentId[a.id] ?? [];
            return (
              <div key={a.id} style={{ ...card, marginBottom: '1rem' }}>
                <RoleBadge>Agent</RoleBadge>
                <div style={strong}>{a.email || 'No email'}</div>
                {(a.display_name || a.username) && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {a.display_name || a.username}
                  </div>
                )}
                <div style={{ fontSize: '0.875rem', marginTop: '0.65rem', color: 'var(--text-muted)' }}>
                  Invite link count: <strong style={{ color: 'var(--text)' }}>{invited}</strong>
                </div>
                <div style={{ fontSize: '0.8125rem', marginTop: 4, color: canPromote ? 'var(--success, #3fb950)' : 'var(--text-muted)' }}>
                  {canPromote ? '✓ Can promote to super agent' : '✗ Cannot promote yet — they still have people on their link'}
                </div>
                <CopyIdButton id={a.id} />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    marginTop: '0.75rem',
                    padding: '0.55rem 1rem',
                    fontSize: '0.875rem',
                  }}
                  disabled={actionId === a.id || !canPromote}
                  title={!canPromote ? 'Invite link count must be 0' : undefined}
                  onClick={() => promote(a.id)}
                >
                  {actionId === a.id ? 'Working…' : 'Promote to super agent'}
                </button>
                <div style={nested}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Their regular customers ({usersUnder.length})
                  </div>
                  <RegularCustomersList
                    users={usersUnder}
                    emptyLabel="No regular customers on their invite link yet."
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <h2 className="page-title" style={{ fontSize: '1.05rem' }}>
        All regular users ({regularUsers.length})
      </h2>
      <p style={{ ...labelMuted, marginTop: '-0.25rem', marginBottom: '0.75rem' }}>
        Everyone with a normal account. “Referred by” is the user ID of whoever invited them.
      </p>
      <div className="card card-lg">
        {regularError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{regularError}</div>}
        {regularUsers.length === 0 && !regularError ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No regular user accounts.</p>
        ) : regularUsers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {regularUsers.map((u) => (
              <div key={u.id} style={{ ...card, marginBottom: 0, padding: '0.85rem' }}>
                <div style={labelMuted}>Regular user</div>
                <div style={strong}>{u.email || 'No email'}</div>
                {(u.display_name || u.username) && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {u.display_name || u.username}
                  </div>
                )}
                <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                  Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </div>
                {u.referred_by_id ? (
                  <div style={{ fontSize: '0.8125rem', marginTop: '0.35rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    Referred by (user ID): <span style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{u.referred_by_id}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8125rem', marginTop: '0.35rem', color: 'var(--text-muted)' }}>Not referred by anyone</div>
                )}
                <CopyIdButton id={u.id} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
