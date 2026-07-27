'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { USER_ROLE_LABELS, US_STATES, type UserRole } from '@/types';

interface Props {
  defaultName: string;
  email: string;
}

const ROLE_KEYS = Object.keys(USER_ROLE_LABELS) as UserRole[];

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: '5px',
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  fontSize: '14px',
  fontFamily: 'inherit',
  color: 'var(--text-primary)',
  background: '#ffffff',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
};

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <div style={{ fontSize: '12px', color: '#b13f08', marginTop: '4px' }}>{children}</div>
  );
}

/**
 * One-time registration capture. Deliberately has no close control and no
 * click-outside dismiss — every signed-in user must complete it once.
 */
export default function RegistrationModal({ defaultName, email }: Props) {
  const router = useRouter();

  const [name, setName]                 = useState(defaultName);
  const [organization, setOrganization] = useState('');
  const [state, setState]               = useState('');
  const [zip, setZip]                   = useState('');
  const [county, setCounty]             = useState('');
  const [roles, setRoles]               = useState<UserRole[]>([]);
  const [roleOther, setRoleOther]       = useState('');

  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /** Drop a field's error as soon as the user starts correcting it. */
  const clearError = (key: string) =>
    setErrors(current => (current[key] ? { ...current, [key]: '' } : current));

  const toggleRole = (role: UserRole) => {
    clearError('roles');
    setRoles(current =>
      current.includes(role) ? current.filter(r => r !== role) : [...current, role]
    );
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim())         next.name         = 'Name is required.';
    if (!organization.trim()) next.organization = 'Organization is required.';
    if (!state)               next.state        = 'Select a state.';
    if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) next.zip = 'Enter a valid ZIP code.';
    if (!county.trim())       next.county       = 'County is required.';
    if (roles.length === 0)   next.roles        = 'Select at least one role.';
    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const response = await fetch('/api/account/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organization, state, zip, county, roles, roleOther }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.errors) setErrors(data.errors);
        setFormError(data.error ?? 'Please correct the highlighted fields.');
        return;
      }

      // Server components re-run, RegistrationGate now sees the user as
      // registered, and the modal unmounts.
      router.refresh();
    } catch {
      setFormError('Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(22, 61, 91, 0.75)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '2rem 1rem', overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: '620px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--fgi-navy)', color: '#ffffff',
          padding: '1.25rem 1.75rem', borderBottom: '5px solid var(--fgi-teal)',
        }}>
          <h2 id="registration-title" style={{ fontSize: '22px', fontWeight: 700 }}>
            Tell Us a Little About Yourself
          </h2>
          <p style={{ fontSize: '14px', marginTop: '5px', color: 'rgba(255,255,255,0.88)' }}>
            This helps us understand our community so we can keep improving the
            Learning Resource Center. All fields are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle} htmlFor="reg-name">Name</label>
            <input id="reg-name" style={fieldStyle} value={name}
              onChange={e => { clearError('name'); setName(e.target.value); }} autoComplete="name" />
            <ErrorText>{errors.name}</ErrorText>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle} htmlFor="reg-email">Email</label>
            <input id="reg-email" style={{ ...fieldStyle, background: '#f2f2f2', color: 'var(--text-secondary)' }}
              value={email} readOnly aria-describedby="reg-email-note" />
            <div id="reg-email-note" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              This is the email on your account.
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle} htmlFor="reg-org">Organization</label>
            <input id="reg-org" style={fieldStyle} value={organization}
              onChange={e => { clearError('organization'); setOrganization(e.target.value); }} autoComplete="organization" />
            <ErrorText>{errors.organization}</ErrorText>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '1rem', marginBottom: '1.25rem',
          }}>
            <div>
              <label style={labelStyle} htmlFor="reg-state">State</label>
              <select id="reg-state" style={fieldStyle} value={state}
                onChange={e => { clearError('state'); setState(e.target.value); }}>
                <option value="">Select…</option>
                {US_STATES.map(({ code, name: stateName }) => (
                  <option key={code} value={code}>{stateName}</option>
                ))}
              </select>
              <ErrorText>{errors.state}</ErrorText>
            </div>
            <div>
              <label style={labelStyle} htmlFor="reg-zip">Zip</label>
              <input id="reg-zip" style={fieldStyle} value={zip} inputMode="numeric"
                onChange={e => { clearError('zip'); setZip(e.target.value); }} autoComplete="postal-code" />
              <ErrorText>{errors.zip}</ErrorText>
            </div>
            <div>
              <label style={labelStyle} htmlFor="reg-county">County</label>
              <input id="reg-county" style={fieldStyle} value={county}
                onChange={e => { clearError('county'); setCounty(e.target.value); }} />
              <ErrorText>{errors.county}</ErrorText>
            </div>
          </div>

          <fieldset style={{ border: 'none', marginBottom: '1.25rem' }}>
            <legend style={{ ...labelStyle, marginBottom: '8px' }}>
              Role (select all that apply)
            </legend>
            {ROLE_KEYS.map(role => (
              <label key={role} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                marginBottom: '7px', fontSize: '14px',
                color: 'var(--text-body-dark)', cursor: 'pointer', lineHeight: 1.4,
              }}>
                <input type="checkbox" checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  style={{ marginTop: '3px', accentColor: 'var(--fgi-blue)', flexShrink: 0 }} />
                {USER_ROLE_LABELS[role]}
              </label>
            ))}

            {roles.includes('other') && (
              <input
                style={{ ...fieldStyle, marginTop: '4px' }}
                value={roleOther}
                onChange={e => setRoleOther(e.target.value)}
                placeholder="Tell us your role (optional)"
                aria-label="Other role"
              />
            )}
            <ErrorText>{errors.roles}</ErrorText>
          </fieldset>

          {formError && (
            <div style={{
              background: '#fdf0eb', border: '1px solid #f0c4b4', color: '#b13f08',
              borderRadius: 'var(--radius-sm)', padding: '9px 12px',
              fontSize: '13px', marginBottom: '1rem',
            }}>
              {formError}
            </div>
          )}

          <p style={{
            fontSize: '12px', lineHeight: 1.5, color: 'var(--text-muted)',
            background: 'var(--body-bg)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)', padding: '10px 12px',
            marginBottom: '1.25rem',
          }}>
            This Learning Resource Center is hosted by the Fletcher Group. Fletcher Group
            does not share your data with third parties. If you are registering via a
            partner organization&rsquo;s page, your information is also made available to
            that partner only.
          </p>

          <button type="submit" disabled={saving} style={{
            width: '100%', background: 'var(--fgi-blue)', color: '#ffffff',
            border: 'none', borderRadius: 'var(--radius-md)',
            padding: '12px 0', fontSize: '15px', fontWeight: 700,
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
