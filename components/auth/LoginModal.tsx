'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  confirmResetAction, loginAction, requestResetAction,
} from '@/components/auth/login-actions';

/**
 * On-site login (8-20-26 auth rebuild, phase 2) — replaces the redirect to
 * the Cognito hosted page. The header's Log In pill opens this modal; the
 * Cognito call happens server-side (login-actions.ts → lib/cognito.ts) and
 * on success the modal closes and the page refreshes in place.
 *
 * Three views: login → forgot (email) → reset (code + new password, which
 * auto-signs-in on success). Modal chrome matches FeedbackModal /
 * PodcastInfoModal.
 */

type View = 'login' | 'forgot' | 'reset';

const FIELD = {
  width: '100%', padding: '10px 12px', fontSize: '15px', fontFamily: 'inherit',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
} as const;

const LABEL = {
  display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '4px',
  color: 'var(--text-primary)',
} as const;

const PRIMARY_BTN = {
  display: 'block', width: '100%', padding: '11px 12px', border: 'none',
  borderRadius: '999px', background: 'var(--fgi-blue)', color: '#ffffff',
  fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
} as const;

export default function LoginModal(
  { color = '#ffffff' }: { color?: string },
) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    headingRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, view]);

  const reset = (v: View) => { setView(v); setError(''); setNotice(''); };

  const submitLogin = () => startTransition(async () => {
    setError('');
    const res = await loginAction(email, password);
    if (res.ok) {
      setOpen(false);
      setPassword('');
      router.refresh();
    } else {
      setError(res.error);
    }
  });

  const submitForgot = () => startTransition(async () => {
    setError('');
    const res = await requestResetAction(email);
    if (res.ok) {
      reset('reset');
      setNotice('If that email has an account, a reset code is on its way.');
    } else {
      setError(res.error);
    }
  });

  const submitReset = () => startTransition(async () => {
    setError('');
    const res = await confirmResetAction(email, code, newPassword);
    if (res.ok) {
      setOpen(false);
      setCode('');
      setNewPassword('');
      setPassword('');
      router.refresh();
    } else {
      setError(res.error);
    }
  });

  const TITLES: Record<View, string> = {
    login: 'Log In',
    forgot: 'Reset Your Password',
    reset: 'Enter Your Reset Code',
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); reset('login'); }}
        style={{
          background: 'transparent', color, border: `1.5px solid ${color}`,
          borderRadius: '20px', padding: '7px 20px', fontSize: '14px',
          fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Log In
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(22, 61, 91, 0.75)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '2rem 1rem', overflowY: 'auto',
          }}
        >
          <div style={{
            background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '420px', marginTop: '6vh',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden',
          }}>
            <div style={{
              background: 'var(--fgi-navy)', color: '#ffffff',
              padding: '1.25rem 1.75rem', borderBottom: '5px solid var(--fgi-teal)',
              display: 'flex', alignItems: 'flex-start', gap: '1rem',
            }}>
              <h2
                id="login-modal-title" ref={headingRef} tabIndex={-1}
                style={{ fontSize: '22px', fontWeight: 700, outline: 'none', flex: 1 }}
              >
                {TITLES[view]}
              </h2>
              <button
                type="button" onClick={() => setOpen(false)} aria-label="Close"
                style={{
                  background: 'none', border: 'none', color: '#ffffff',
                  fontSize: '26px', lineHeight: 1, padding: '0 4px', cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
              {notice && (
                <p style={{
                  fontSize: '14px', lineHeight: 1.5, color: 'var(--text-secondary)',
                  background: 'var(--fgi-blue-light)', borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px', marginBottom: '1rem',
                }}>
                  {notice}
                </p>
              )}

              {view === 'login' && (
                <form onSubmit={(e) => { e.preventDefault(); submitLogin(); }}>
                  <div style={{ marginBottom: '0.9rem' }}>
                    <label style={LABEL} htmlFor="login-email">Email</label>
                    <input
                      id="login-email" type="email" autoComplete="email" required
                      value={email} onChange={(e) => setEmail(e.target.value)} style={FIELD}
                    />
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={LABEL} htmlFor="login-password">Password</label>
                    <input
                      id="login-password" type="password" autoComplete="current-password" required
                      value={password} onChange={(e) => setPassword(e.target.value)} style={FIELD}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => reset('forgot')}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      color: 'var(--fgi-blue)', fontSize: '13px', fontWeight: 600,
                      fontFamily: 'inherit', marginBottom: '1.1rem',
                    }}
                  >
                    Forgot your password?
                  </button>
                  {error && <ErrorLine text={error} />}
                  <button type="submit" disabled={pending} style={{ ...PRIMARY_BTN, opacity: pending ? 0.6 : 1 }}>
                    {pending ? 'Logging in…' : 'Log In'}
                  </button>
                </form>
              )}

              {view === 'forgot' && (
                <form onSubmit={(e) => { e.preventDefault(); submitForgot(); }}>
                  <p style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Enter your email and we&rsquo;ll send you a code to reset your password.
                  </p>
                  <div style={{ marginBottom: '1.1rem' }}>
                    <label style={LABEL} htmlFor="forgot-email">Email</label>
                    <input
                      id="forgot-email" type="email" autoComplete="email" required
                      value={email} onChange={(e) => setEmail(e.target.value)} style={FIELD}
                    />
                  </div>
                  {error && <ErrorLine text={error} />}
                  <button type="submit" disabled={pending} style={{ ...PRIMARY_BTN, opacity: pending ? 0.6 : 1 }}>
                    {pending ? 'Sending…' : 'Send Reset Code'}
                  </button>
                  <BackLink onClick={() => reset('login')} />
                </form>
              )}

              {view === 'reset' && (
                <form onSubmit={(e) => { e.preventDefault(); submitReset(); }}>
                  <div style={{ marginBottom: '0.9rem' }}>
                    <label style={LABEL} htmlFor="reset-code">Code from your email</label>
                    <input
                      id="reset-code" inputMode="numeric" autoComplete="one-time-code" required
                      value={code} onChange={(e) => setCode(e.target.value)} style={FIELD}
                    />
                  </div>
                  <div style={{ marginBottom: '1.1rem' }}>
                    <label style={LABEL} htmlFor="reset-password">New password</label>
                    <input
                      id="reset-password" type="password" autoComplete="new-password" required
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={FIELD}
                    />
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      At least 8 characters, with upper and lower case letters and a number.
                    </div>
                  </div>
                  {error && <ErrorLine text={error} />}
                  <button type="submit" disabled={pending} style={{ ...PRIMARY_BTN, opacity: pending ? 0.6 : 1 }}>
                    {pending ? 'Resetting…' : 'Reset Password & Log In'}
                  </button>
                  <BackLink onClick={() => reset('forgot')} label="Didn’t get a code? Send another" />
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p style={{
      fontSize: '14px', color: '#b13f08', fontWeight: 600,
      margin: '0 0 0.9rem',
    }}>
      {text}
    </p>
  );
}

function BackLink({ onClick, label = '← Back to log in' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        display: 'block', margin: '0.9rem auto 0', background: 'none', border: 'none',
        padding: 0, cursor: 'pointer', color: 'var(--fgi-blue)', fontSize: '13px',
        fontWeight: 600, fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}
