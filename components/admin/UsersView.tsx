'use client';

/**
 * Admin users page body (modeled on DDOR's app/admin/users, 8-31-26,
 * re-skinned LRC-style and much simpler: three roles, no account creation —
 * accounts come from site sign-up; admins only adjust access here).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUserRow } from '@/lib/admin-users';
import { deleteUserAction, updateUserAccessAction } from './admin-actions';
import { roleConfig, SURFACE_OPTIONS, USER_ROLES } from './roles';

const joined = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const CARD: React.CSSProperties = {
  background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
};

const FIELD: React.CSSProperties = {
  padding: '7px 10px', fontSize: '13.5px', fontFamily: 'inherit',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
  background: '#fff', color: 'var(--text-primary)',
};

function Pill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span style={{
      background: bg, color: fg, fontSize: '11.5px', fontWeight: 700,
      padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

const surfaceLabel = (v: string | null) =>
  SURFACE_OPTIONS.find((s) => s.value === v)?.label ?? '—';

export default function UsersView({ users, selfId }: { users: AdminUserRow[]; selfId: string }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('learner');
  const [editSurface, setEditSurface] = useState('fgi');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Two-step inline confirm (no browser dialog): first click arms, second deletes.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    const hay = `${u.given_name ?? ''} ${u.family_name ?? ''} ${u.email} ${u.organization ?? ''}`.toLowerCase();
    return (!q || hay.includes(q)) && (!roleFilter || u.role === roleFilter);
  });

  const startEdit = (u: AdminUserRow) => {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditSurface(u.registered_surface ?? 'fgi');
    setError('');
    setConfirmDeleteId(null);
  };

  const remove = async (id: string) => {
    if (saving) return;
    setSaving(true);
    setError('');
    const result = await deleteUserAction(id);
    setSaving(false);
    setConfirmDeleteId(null);
    if ('error' in result) { setError(result.error); return; }
    setEditingId(null);
    router.refresh();
  };

  const save = async () => {
    if (!editingId || saving) return;
    setSaving(true);
    setError('');
    const result = await updateUserAccessAction(editingId, {
      role: editRole, registeredSurface: editSurface,
    });
    setSaving(false);
    if ('error' in result) { setError(result.error); return; }
    setEditingId(null);
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Role legend */}
      <div style={{ ...CARD, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {USER_ROLES.map((r) => (
          <div key={r.value} style={{ display: 'flex', alignItems: 'baseline', gap: '10px', fontSize: '13px' }}>
            <Pill bg={r.bg} fg={r.fg}>{r.label}</Pill>
            <span style={{ color: 'var(--text-secondary)' }}>{r.desc}</span>
          </div>
        ))}
      </div>

      {/* Search + role filter */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, organization…"
          aria-label="Search users"
          style={{ ...FIELD, flex: '1 1 260px', padding: '9px 14px' }}
        />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setRoleFilter('')}
            style={{
              ...FIELD, cursor: 'pointer', borderRadius: '999px', fontWeight: 600,
              background: !roleFilter ? 'var(--fgi-navy)' : '#fff',
              color: !roleFilter ? '#fff' : 'var(--text-secondary)',
            }}
          >
            All ({users.length})
          </button>
          {USER_ROLES.map((r) => {
            const n = users.filter((u) => u.role === r.value).length;
            return (
              <button
                key={r.value}
                onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}
                style={{
                  ...FIELD, cursor: 'pointer', borderRadius: '999px', fontWeight: 600,
                  background: roleFilter === r.value ? 'var(--fgi-navy)' : '#fff',
                  color: roleFilter === r.value ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {r.label} ({n})
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div role="alert" style={{
          fontSize: '13px', color: '#8a1c1c', background: '#fdf0f0',
          border: '1px solid #f2d4d4', borderRadius: 'var(--radius-md)', padding: '9px 12px',
        }}>
          {error}
        </div>
      )}

      {/* User rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((u) => {
          const rc = roleConfig(u.role);
          const name = [u.given_name, u.family_name].filter(Boolean).join(' ') || u.email;
          const editing = editingId === u.id;
          const self = u.id === selfId;
          return (
            <div key={u.id} style={{ ...CARD, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14.5px' }}>
                    {name}
                    {self && <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--text-muted)' }}> (you)</span>}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                    {u.email}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {[u.organization, u.state].filter(Boolean).join(' · ') || 'No organization on file'}
                    {' · '}
                    {u.registration_completed_at ? 'Registered' : 'Registration incomplete'}
                    {u.moodle_linked ? ' · LMS linked' : ''}
                    {' · Joined '}{joined(u.created_at)}
                  </div>
                </div>

                {editing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={FIELD} aria-label="Role">
                      {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <select value={editSurface} onChange={(e) => setEditSurface(e.target.value)} style={FIELD} aria-label="Home portal">
                      {SURFACE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <button
                      onClick={save}
                      disabled={saving}
                      style={{
                        ...FIELD, cursor: saving ? 'default' : 'pointer', fontWeight: 700,
                        background: 'var(--fgi-blue)', color: '#fff', border: 'none',
                        opacity: saving ? 0.55 : 1,
                      }}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      disabled={saving}
                      style={{ ...FIELD, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                    {u.role !== 'admin' && (confirmDeleteId === u.id ? (
                      <button
                        onClick={() => remove(u.id)}
                        disabled={saving}
                        style={{
                          ...FIELD, cursor: saving ? 'default' : 'pointer', fontWeight: 700,
                          background: '#c62828', color: '#fff', border: 'none',
                          opacity: saving ? 0.55 : 1,
                        }}
                      >
                        {saving ? 'Deleting…' : 'Really delete — this is permanent'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(u.id)}
                        disabled={saving}
                        title="Removes the account, sign-in, and learner data. Issued certificates stay valid."
                        style={{ ...FIELD, cursor: 'pointer', fontWeight: 600, color: '#c62828' }}
                      >
                        Delete…
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <Pill bg="#eef1f3" fg="#5f6e7c">{surfaceLabel(u.registered_surface)}</Pill>
                    <Pill bg={rc.bg} fg={rc.fg}>{rc.label}</Pill>
                    {self ? (
                      <span
                        title="You can’t change your own access — ask another admin."
                        style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}
                      >
                        —
                      </span>
                    ) : (
                      <button
                        onClick={() => startEdit(u)}
                        style={{ ...FIELD, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ ...CARD, padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
            No users match.
          </div>
        )}
      </div>
    </div>
  );
}
