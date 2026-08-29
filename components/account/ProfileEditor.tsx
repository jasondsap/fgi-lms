'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { USER_ROLE_LABELS, US_STATES, type UserRole } from '@/types';

/**
 * Inline "Edit profile" form on the My Learning page. Posts to the same
 * endpoint as registration (/api/account/registration) — identical fields
 * and validation, and re-submitting simply replaces the profile.
 */
const FIELD = {
  width: '100%', padding: '9px 12px', fontSize: '14px', fontFamily: 'inherit',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
  background: '#ffffff', color: 'var(--text-primary)',
} as const;
const LABEL = {
  display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px',
  color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em',
} as const;
const ROW = { marginBottom: '0.8rem' } as const;

export interface ProfileValues {
  name: string;
  organization: string;
  state: string;
  zip: string;
  county: string;
  roles: UserRole[];
  roleOther: string;
}

export default function ProfileEditor({
  initial,
  accent,
}: {
  initial: ProfileValues;
  accent: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const set = (key: keyof ProfileValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleRole = (role: UserRole) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));

  const submit = () => startTransition(async () => {
    setErrors({});
    const res = await fetch('/api/account/registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors(data.errors ?? { form: data.error ?? 'Could not save your profile.' });
      return;
    }
    setOpen(false);
    router.refresh();
  });

  const button = {
    fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
    borderRadius: '999px', padding: '7px 16px',
  } as const;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...button, background: 'transparent', color: accent, border: `1.5px solid ${accent}` }}
      >
        Edit profile
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      style={{
        marginTop: '14px', padding: '18px', background: 'var(--fgi-card-face)',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={ROW}>
          <label style={LABEL} htmlFor="pf-name">Name</label>
          <input id="pf-name" required value={form.name} onChange={set('name')} style={FIELD} />
          {errors.name && <Err>{errors.name}</Err>}
        </div>
        <div style={ROW}>
          <label style={LABEL} htmlFor="pf-org">Organization</label>
          <input id="pf-org" required value={form.organization} onChange={set('organization')} style={FIELD} />
          {errors.organization && <Err>{errors.organization}</Err>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr', gap: '0 14px' }}>
        <div style={ROW}>
          <label style={LABEL} htmlFor="pf-state">State</label>
          <select id="pf-state" required value={form.state} onChange={set('state')} style={FIELD}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          {errors.state && <Err>{errors.state}</Err>}
        </div>
        <div style={ROW}>
          <label style={LABEL} htmlFor="pf-zip">ZIP</label>
          <input id="pf-zip" required inputMode="numeric" value={form.zip} onChange={set('zip')} style={FIELD} />
          {errors.zip && <Err>{errors.zip}</Err>}
        </div>
        <div style={ROW}>
          <label style={LABEL} htmlFor="pf-county">County</label>
          <input id="pf-county" required value={form.county} onChange={set('county')} style={FIELD} />
          {errors.county && <Err>{errors.county}</Err>}
        </div>
      </div>

      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 0.8rem' }}>
        <legend style={{ ...LABEL, marginBottom: '6px' }}>I am a… (select all that apply)</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px' }}>
          {(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((role) => (
            <label key={role} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={form.roles.includes(role)}
                onChange={() => toggleRole(role)}
                style={{ marginTop: '3px' }}
              />
              {USER_ROLE_LABELS[role]}
            </label>
          ))}
        </div>
        {form.roles.includes('other') && (
          <input
            placeholder="Please describe"
            value={form.roleOther}
            onChange={set('roleOther')}
            style={{ ...FIELD, marginTop: '8px' }}
          />
        )}
        {errors.roles && <Err>{errors.roles}</Err>}
      </fieldset>

      {errors.form && <Err>{errors.form}</Err>}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="submit"
          disabled={pending}
          style={{ ...button, background: accent, color: '#ffffff', border: `1.5px solid ${accent}`, opacity: pending ? 0.7 : 1 }}
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => { setForm({ ...initial }); setErrors({}); setOpen(false); }}
          style={{ ...button, background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '12px', color: '#b13f08', fontWeight: 600, marginTop: '3px' }}>{children}</div>;
}
