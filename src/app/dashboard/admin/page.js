'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  adminListAgents,
  adminListUsers,
  adminPromoteToSuperAgent,
  adminPromoteToSuperSuperAgent,
  adminListRegularUsers,
} from '@/lib/api';
import { isAdminOperatorEmail, ADMIN_OPERATOR_EMAIL } from '@/lib/admin-config';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { DashScreenHeader } from '@/components/DashScreenHeader';

function formatLedgerAmount(n) {
  const x = Number(n) || 0;
  if (x === 0) return '0';
  if (Math.abs(x) >= 1) return x.toLocaleString('en-US', { maximumFractionDigits: 8 });
  return String(x);
}

function roleLabel(role) {
  if (role === 'super_super_agent') return 'Super super';
  if (role === 'super_agent') return 'Super agent';
  if (role === 'agent') return 'Agent';
  if (role === 'regular') return 'Regular';
  if (role === 'admin') return 'Admin';
  return role || '—';
}

function displayName(u) {
  return u?.email || u?.display_name || u?.username || 'No email';
}

function parentLabel(u) {
  if (!u?.referred_by_id) return '—';
  const name = u.parent_email || u.parent_display_name;
  if (name) return `${name} (${roleLabel(u.parent_role)})`;
  return u.referred_by_id;
}

function matchesQuery(u, q) {
  if (!q) return true;
  const hay = [u.email, u.display_name, u.username, u.id, u.role, u.parent_email, u.referred_by_id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function LedgerLine({ wallets }) {
  const list = Array.isArray(wallets) ? wallets : [];
  if (!list.length) return <span className="admin-muted">No wallets</span>;
  return (
    <span className="admin-wallets">
      {list.map((w) => (
        <span key={w.currency}>
          {w.currency} {formatLedgerAmount(w.balance)}
        </span>
      ))}
    </span>
  );
}

function RoleBadge({ role }) {
  return <span className={`admin-badge admin-badge--${role || 'regular'}`}>{roleLabel(role)}</span>;
}

function TreeNode({ node, childrenByParent, query, depth = 0 }) {
  const kids = childrenByParent[node.id] || [];
  const q = query.trim().toLowerCase();
  const selfMatch = matchesQuery(node, q);
  const childHit = q
    ? kids.some((k) => matchesQuery(k, q) || hasDescendantMatch(k.id, childrenByParent, q))
    : false;
  const [open, setOpen] = useState(depth < 1 || Boolean(q && (selfMatch || childHit)));

  useEffect(() => {
    if (q && (selfMatch || childHit)) setOpen(true);
  }, [q, selfMatch, childHit]);

  if (q && !selfMatch && !childHit) return null;

  return (
    <li className="admin-tree-node">
      <div className="admin-tree-row">
        {kids.length ? (
          <button type="button" className="admin-tree-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="admin-tree-toggle admin-tree-toggle--empty" />
        )}
        <RoleBadge role={node.role} />
        <div className="admin-tree-copy">
          <strong>{displayName(node)}</strong>
          <span>
            {node.invitedCount || 0} under them
            {node.created_at ? ` · joined ${new Date(node.created_at).toLocaleDateString()}` : ''}
          </span>
        </div>
        <LedgerLine wallets={node.wallets} />
      </div>
      {open && kids.length > 0 && (
        <ul className="admin-tree-children">
          {kids.map((child) => (
            <TreeNode key={child.id} node={child} childrenByParent={childrenByParent} query={query} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function hasDescendantMatch(id, childrenByParent, q) {
  const kids = childrenByParent[id] || [];
  return kids.some((k) => matchesQuery(k, q) || hasDescendantMatch(k.id, childrenByParent, q));
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [users, setUsers] = useState([]);
  const [listError, setListError] = useState('');
  const [actionId, setActionId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('tree');

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
        try {
          const data = await adminListUsers(user.id, token);
          const list = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
          if (!cancelled) setUsers(list);
        } catch {
          const [agentList, regList] = await Promise.all([
            adminListAgents(user.id, token),
            adminListRegularUsers(user.id, token).catch(() => []),
          ]);
          const merged = [...(Array.isArray(agentList) ? agentList : []), ...(Array.isArray(regList) ? regList : [])];
          const byId = Object.fromEntries(merged.map((r) => [r.id, r]));
          if (!cancelled) {
            setUsers(
              merged.map((row) => {
                const parent = row.referred_by_id ? byId[row.referred_by_id] : null;
                return {
                  ...row,
                  parent_email: parent?.email || null,
                  parent_role: parent?.role || null,
                  parent_display_name: parent?.display_name || parent?.username || null,
                };
              }),
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          setListError(e?.message || 'Failed to load users');
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, token]);

  const byId = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const childrenByParent = useMemo(() => {
    const m = {};
    for (const u of users) {
      if (!u.referred_by_id) continue;
      if (!m[u.referred_by_id]) m[u.referred_by_id] = [];
      m[u.referred_by_id].push(u);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
    }
    return m;
  }, [users]);

  const roots = useMemo(() => {
    return users
      .filter((u) => !u.referred_by_id || !byId[u.referred_by_id])
      .sort((a, b) => {
        const rank = { super_super_agent: 0, super_agent: 1, agent: 2, admin: 3, regular: 4 };
        return (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || String(a.email || '').localeCompare(String(b.email || ''));
      });
  }, [users, byId]);

  const counts = useMemo(() => {
    const c = { total: users.length, regular: 0, agent: 0, super_agent: 0, super_super_agent: 0, admin: 0, unattached: 0 };
    for (const u of users) {
      if (c[u.role] != null) c[u.role] += 1;
      if (!u.referred_by_id) c.unattached += 1;
    }
    return c;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => matchesQuery(u, q));
  }, [users, query]);

  const agents = users.filter((r) => r.role === 'agent');
  const superAgents = users.filter((r) => r.role === 'super_agent');

  async function promote(targetUserId) {
    if (!user?.id || !token) return;
    if (!window.confirm('Promote this user to super agent?')) return;
    setActionId(targetUserId);
    setActionMessage('');
    try {
      await adminPromoteToSuperAgent(user.id, targetUserId, token);
      setActionMessage('Promoted to super agent.');
      setUsers((prev) => prev.map((r) => (r.id === targetUserId ? { ...r, role: 'super_agent' } : r)));
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
      setUsers((prev) => prev.map((r) => (r.id === targetUserId ? { ...r, role: 'super_super_agent' } : r)));
    } catch (e) {
      setActionMessage(e?.message || 'Failed');
    } finally {
      setActionId(null);
    }
  }

  if (loading) return <AppLoadingScreen />;

  if (forbidden) {
    return (
      <div className="page dash-screen">
        <DashScreenHeader title="Admin" backHref="/dashboard/account" />
        <div className="card card-lg">
          <p style={{ color: 'var(--text-muted)' }}>
            Admin tools are only available when signed in as <strong>{ADMIN_OPERATOR_EMAIL}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page dash-screen admin-page">
      <DashScreenHeader title="Admin" backHref="/dashboard/account" />

      <p className="admin-signed">Signed in as {user?.email}</p>

      <section className="admin-stats" aria-label="User counts">
        <div className="admin-stat">
          <span>All users</span>
          <strong>{counts.total}</strong>
        </div>
        <div className="admin-stat">
          <span>Super super</span>
          <strong>{counts.super_super_agent}</strong>
        </div>
        <div className="admin-stat">
          <span>Super agents</span>
          <strong>{counts.super_agent}</strong>
        </div>
        <div className="admin-stat">
          <span>Agents</span>
          <strong>{counts.agent}</strong>
        </div>
        <div className="admin-stat">
          <span>Regular</span>
          <strong>{counts.regular}</strong>
        </div>
        <div className="admin-stat">
          <span>No parent</span>
          <strong>{counts.unattached}</strong>
        </div>
      </section>

      <label className="admin-search">
        <span className="sr-only">Search users</span>
        <input
          className="form-input"
          type="search"
          placeholder="Search email, name, role, parent…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {listError && <div className="alert alert-error">{listError}</div>}
      {actionMessage && <p className="admin-action-msg">{actionMessage}</p>}

      <div className="admin-tabs" role="tablist">
        <button type="button" className={tab === 'tree' ? 'active' : ''} onClick={() => setTab('tree')}>
          Network tree
        </button>
        <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          All users
        </button>
        <button type="button" className={tab === 'promote' ? 'active' : ''} onClick={() => setTab('promote')}>
          Promote
        </button>
      </div>

      {tab === 'tree' && (
        <section className="admin-panel">
          <h2 className="admin-h2">Who sits under whom</h2>
          <p className="admin-hint">Roots first (no parent, or parent missing). Expand a row to see everyone they invited.</p>
          {!roots.length ? (
            <p className="admin-muted">No users yet.</p>
          ) : (
            <ul className="admin-tree">
              {roots.map((node) => (
                <TreeNode key={node.id} node={node} childrenByParent={childrenByParent} query={query} />
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'all' && (
        <section className="admin-panel">
          <h2 className="admin-h2">All users ({filteredUsers.length})</h2>
          <p className="admin-hint">Parent is the person whose invite link they used — shown as email, not a raw ID.</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Under</th>
                  <th>Invited</th>
                  <th>Joined</th>
                  <th>Ledger</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{displayName(u)}</strong>
                      {(u.display_name || u.username) && u.email ? (
                        <div className="admin-muted">{u.display_name || u.username}</div>
                      ) : null}
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="admin-parent-cell">{parentLabel(u)}</td>
                    <td>{u.invitedCount || 0}</td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <LedgerLine wallets={u.wallets} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'promote' && (
        <section className="admin-panel">
          <h2 className="admin-h2">Promote roles</h2>
          <p className="admin-hint">
            Agent → super agent only if they have 0 invites. Super agent → super super can be done anytime.
          </p>

          <h3 className="admin-h3">Super agents ({superAgents.length})</h3>
          {!superAgents.length ? (
            <p className="admin-muted">None yet.</p>
          ) : (
            <ul className="admin-promote-list">
              {superAgents.map((a) => (
                <li key={a.id} className="admin-promote-card">
                  <div>
                    <RoleBadge role={a.role} />
                    <strong>{displayName(a)}</strong>
                    <span className="admin-muted">
                      Under {parentLabel(a)} · {a.invitedCount || 0} invited
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={actionId === a.id}
                    onClick={() => promoteToSuperSuper(a.id)}
                  >
                    {actionId === a.id ? 'Working…' : 'Promote to super super'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3 className="admin-h3">Agents ({agents.length})</h3>
          {!agents.length ? (
            <p className="admin-muted">No agent accounts.</p>
          ) : (
            <ul className="admin-promote-list">
              {agents.map((a) => {
                const invited = Number(a.invitedCount) || 0;
                const canPromote = invited === 0;
                return (
                  <li key={a.id} className="admin-promote-card">
                    <div>
                      <RoleBadge role={a.role} />
                      <strong>{displayName(a)}</strong>
                      <span className="admin-muted">
                        Under {parentLabel(a)} · {invited} invited
                        {canPromote ? ' · can promote' : ' · cannot promote yet'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={actionId === a.id || !canPromote}
                      onClick={() => promote(a.id)}
                    >
                      {actionId === a.id ? 'Working…' : 'Promote to super agent'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
