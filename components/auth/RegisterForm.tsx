'use client';
import { useState, useTransition } from 'react';
import { registerAction } from '@/components/auth/register-actions';
import { USER_ROLE_LABELS, US_STATES } from '@/types';

/**
 * The create-account form inside the auth modal (8-20-26 rebuild, phase 3).
 * One submit: Cognito account + full profile (Jennifer's Registration.docx
 * fields) + which surface they registered from + auto sign-in.
 */

const FIELD = {
  width: '100%', padding: '10px 12px', fontSize: '15px', fontFamily: 'inherit',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
  background: '#ffffff',
} as const;

const LABEL = {
  display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '4px',
  color: 'var(--text-primary)',
} as const;

const ROW = { marginBottom: '0.9rem' } as const;

export default function RegisterForm({
  surface, onSuccess, switchToLogin,
}: {
  surface: string;
  onSuccess: () => void;
  switchToLogin: () => void;
}) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    organization: '', state: '', zip: '', county: '', roleOther: '',
  });
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleRole = (role: string) =>
    setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]));

  const submit = () => startTransition(async () => {
    setError('');
    const res = await registerAction({ ...form, roles, surface });
    if (res.ok) {
      onSuccess();
    } else {
      setError(res.error);
      if (res.error.includes('already exists')) switchToLoginSoon();
    }
  });

  // Give the person a beat to read "already exists" before flipping tabs.
  const switchToLoginSoon = () => setTimeout(switchToLogin, 2500);

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {/* The old post-login registration modal's welcome — kept per Jason
          (8-21) so the combined form leads with the same message. */}
      <div style={{ marginBottom: '1.1rem' }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Tell Us a Little About Yourself
        </div>
        <p style={{
          fontSize: '13px', lineHeight: 1.55, color: 'var(--text-secondary)',
          margin: '4px 0 0',
        }}>
          This helps us understand our community so we can keep improving the
          Learning Resource Center. All fields are required.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <div style={ROW}>
          <label style={LABEL} htmlFor="reg-first">First Name</label>
          <input id="reg-first" autoComplete="given-name" required
            value={form.firstName} onChange={set('firstName')} style={FIELD} />
        </div>
        <div style={ROW}>
          <label style={LABEL} htmlFor="reg-last">Last Name</label>
          <input id="reg-last" autoComplete="family-name" required
            value={form.lastName} onChange={set('lastName')} style={FIELD} />
        </div>
      </div>

      <div style={ROW}>
        <label style={LABEL} htmlFor="reg-email">Email</label>
        <input id="reg-email" type="email" autoComplete="email" required
          value={form.email} onChange={set('email')} style={FIELD} />
      </div>

      <div style={ROW}>
        <label style={LABEL} htmlFor="reg-password">Password</label>
        <input id="reg-password" type="password" autoComplete="new-password" required
          value={form.password} onChange={set('password')} style={FIELD} />
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          At least 8 characters, with upper and lower case letters, a number, and a symbol.
        </div>
      </div>

      <div style={ROW}>
        <label style={LABEL} htmlFor="reg-org">Organization</label>
        <input id="reg-org" autoComplete="organization" required
          value={form.organization} onChange={set('organization')} style={FIELD} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0 12px' }}>
        <div style={ROW}>
          <label style={LABEL} htmlFor="reg-state">State</label>
          <select id="reg-state" required value={form.state} onChange={set('state')} style={FIELD}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        <div style={ROW}>
          <label style={LABEL} htmlFor="reg-zip">Zip</label>
          <input id="reg-zip" autoComplete="postal-code" required
            value={form.zip} onChange={set('zip')} style={FIELD} />
        </div>
      </div>

      <div style={ROW}>
        <label style={LABEL} htmlFor="reg-county">County</label>
        <input id="reg-county" required value={form.county} onChange={set('county')} style={FIELD} />
      </div>

      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 0.9rem' }}>
        <legend style={{ ...LABEL, marginBottom: '6px' }}>
          I am a… <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(select all that apply)</span>
        </legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
            <label key={value} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={roles.includes(value)}
                onChange={() => toggleRole(value)}
                style={{ marginTop: '3px' }}
              />
              {label}
            </label>
          ))}
        </div>
        {roles.includes('other') && (
          <input
            aria-label="Other role"
            placeholder="Tell us more…"
            value={form.roleOther} onChange={set('roleOther')}
            style={{ ...FIELD, marginTop: '8px' }}
          />
        )}
      </fieldset>

      {error && (
        <p style={{ fontSize: '14px', color: '#b13f08', fontWeight: 600, margin: '0 0 0.9rem' }}>
          {error}
        </p>
      )}

      <button
        type="submit" disabled={pending}
        style={{
          display: 'block', width: '100%', padding: '11px 12px', border: 'none',
          borderRadius: '999px', background: 'var(--fgi-blue)', color: '#ffffff',
          fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
          cursor: 'pointer', opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? 'Creating your account…' : 'Create Account'}
      </button>
    </form>
  );
}
