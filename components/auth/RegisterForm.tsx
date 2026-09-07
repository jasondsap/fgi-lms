'use client';
import { useState, useTransition } from 'react';
import { registerAction } from '@/components/auth/register-actions';
import { portalForState } from '@/lib/state-portals';
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
  /** `home` is set when the account was stamped with a state portal instead. */
  onSuccess: (home?: string) => void;
  switchToLogin: () => void;
}) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    organization: '', state: '', zip: '', county: '', roleOther: '',
  });
  const [roles, setRoles] = useState<string[]>([]);
  // "I am a…" starts collapsed to keep the form compact (Jason, 8-31);
  // it springs open if they try to submit without picking one.
  const [rolesOpen, setRolesOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  // State-portal offer (9-7-26): on the FGI form, picking SC or CO opens a
  // panel under the State field with a pre-ticked "register me with the
  // portal" box. Ticked = the account belongs to the portal.
  const [joinStatePortal, setJoinStatePortal] = useState(true);
  const statePortal = surface === 'fgi' ? portalForState(form.state) : null;

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleRole = (role: string) =>
    setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]));

  const submit = () => startTransition(async () => {
    setError('');
    if (roles.length === 0) setRolesOpen(true);
    const res = await registerAction({
      ...form, roles, surface, joinStatePortal: Boolean(statePortal) && joinStatePortal,
    });
    if (res.ok) {
      onSuccess(res.home);
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

      {statePortal && (
        <div
          role="region"
          aria-label={`${statePortal.stateName} Learning Center`}
          style={{
            margin: '-0.2rem 0 1rem', padding: '12px 14px 12px',
            background: 'var(--fgi-tile)', border: '1px solid rgba(37,126,164,0.35)',
            borderLeft: '4px solid var(--fgi-blue)', borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fgi-navy)', marginBottom: '4px' }}>
            {statePortal.stateName} has its own Learning Center
          </div>
          <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
            {statePortal.partner}, our {statePortal.stateName} partner, has a dedicated Learning
            Resource Center hosted by Fletcher Group. It includes the full Fletcher Group library
            plus {statePortal.stateName} certification information and state-specific resources.
            Same account, same password &mdash; you&rsquo;ll just use{' '}
            <strong style={{ whiteSpace: 'nowrap' }}>{statePortal.link}</strong> from now on.
          </p>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={joinStatePortal}
              onChange={(e) => setJoinStatePortal(e.target.checked)}
              style={{ marginTop: '3px', accentColor: 'var(--fgi-blue)' }}
            />
            <span>
              Register me with the {statePortal.portalName}{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(recommended)</span>
            </span>
          </label>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', paddingLeft: '24px' }}>
            Uncheck to register with the Fletcher Group library only.
          </div>
        </div>
      )}

      <div style={ROW}>
        <label style={LABEL} htmlFor="reg-county">County</label>
        <input id="reg-county" required value={form.county} onChange={set('county')} style={FIELD} />
      </div>

      {/* Collapsible (Jason, 8-31) — the 7 checkboxes made the form long, so
          they live behind a disclosure that opens on demand (and opens itself
          if someone submits without picking one). */}
      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 0.9rem' }}>
        <button
          type="button"
          onClick={() => setRolesOpen((v) => !v)}
          aria-expanded={rolesOpen}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '9px 12px', fontFamily: 'inherit', cursor: 'pointer',
            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
            background: '#ffffff', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            I am a…{' '}
            <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
              (select all that apply{roles.length > 0 ? ` — ${roles.length} selected` : ''})
            </span>
          </span>
          <svg width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden
            style={{ flexShrink: 0, transition: 'transform 0.15s', transform: rolesOpen ? 'rotate(180deg)' : 'none' }}>
            <path d="M1 1l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {rolesOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 4px 0' }}>
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
        )}
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

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="submit" disabled={pending}
          style={{
            flex: 1, padding: '11px 12px', border: 'none',
            borderRadius: '999px', background: 'var(--fgi-blue)', color: '#ffffff',
            fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer', opacity: pending ? 0.6 : 1,
          }}
        >
          {pending
            ? 'Creating your account…'
            : statePortal && joinStatePortal ? `Create Account & Go to ${statePortal.partner}` : 'Create Account'}
        </button>
        {/* Gold help escape hatch (Jason, 8-31) — mailto keeps it working for
            someone stuck before they even have an account. */}
        <a
          href="mailto:LC@fletchergroup.org"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '11px 20px', borderRadius: '999px', textDecoration: 'none',
            background: 'var(--fgi-gold)', color: 'var(--fgi-navy)',
            fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap',
          }}
        >
          Get Help
        </a>
      </div>

      <p style={{
        fontSize: '11.5px', lineHeight: 1.5, color: 'var(--text-muted)',
        margin: '0.9rem 0 0',
      }}>
        Disclaimer: This Learning Resource Center is hosted by the Fletcher Group.
        Fletcher Group does not share your data with third parties. If you are
        registering via a partner organization&rsquo;s page, your information is also
        made available to that partner only. Your email will be added to Fletcher
        Group&rsquo;s mailing list to receive updates and other recovery ecosystem
        support information. You can unsubscribe anytime via the link in those emails.
      </p>
    </form>
  );
}
