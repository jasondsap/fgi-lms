'use client';
import { useEffect, useRef, useState } from 'react';
import { HONEYPOT_FIELD } from '@/lib/mailchimp';

/*
 * "Mailing List Sign Up" in the header, as a modal rather than a trip to
 * Mailchimp's hosted page.
 *
 * Built on the same shape as FeedbackModal — navy header on a teal rule, Esc to
 * close, backdrop click to close, page scroll locked while open — so the two
 * dialogs on the site behave identically.
 *
 * Collects first name, last name and email. All three are required here even
 * though Mailchimp treats the two name merge fields as optional — the audience
 * would otherwise accept a contact with no name at all.
 *
 * The four "Email Preferences" groups in the Mailchimp form config are still
 * disabled and so are not offered; adding them is a change here and in
 * lib/mailchimp.ts, not a change of approach.
 */

const FIELD = {
  width: '100%', padding: '10px 12px', fontSize: '15px',
  fontFamily: 'inherit', color: 'var(--text-primary)',
  background: '#ffffff', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
};

const LABEL = {
  display: 'block', fontSize: '15px', fontWeight: 600,
  color: 'var(--text-primary)', marginBottom: '8px',
};

export default function MailingListModal() {
  const [open, setOpen]           = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [trap, setTrap]           = useState('');   // honeypot; a person leaves it empty
  const [sending, setSending]     = useState(false);
  const [done, setDone]           = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const inputRef  = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Closing returns focus to the header button, so keyboard users are not
  // dropped back at the top of the document.
  const close = () => {
    setOpen(false);
    openerRef.current?.focus();
  };

  // Reopening after a success should offer a fresh form, not the thank-you.
  const reopen = () => {
    setDone(null);
    setError(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          [HONEYPOT_FIELD]: trap,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');

      // "Already on the list" is not an error the visitor can fix, so it lands
      // on the same closing panel as a new subscription.
      if (body.status === 'invalid') setError(body.message);
      else setDone(body.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={reopen}
        style={{
          display: 'inline-block',
          background: 'var(--fgi-blue)',
          color: '#ffffff',
          fontSize: '16px',
          fontFamily: 'inherit',
          border: 'none',
          padding: '7px 20px',
          borderRadius: '999px',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
      >
        Mailing List Sign Up
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mailing-list-title"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(22, 61, 91, 0.75)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '4rem 1rem 2rem', overflowY: 'auto',
          }}
        >
          <div style={{
            background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '520px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden',
            textAlign: 'left',
          }}>
            <div style={{
              background: 'var(--fgi-navy)', color: '#ffffff',
              padding: '1.25rem 1.75rem', borderBottom: '5px solid var(--fgi-teal)',
              display: 'flex', alignItems: 'flex-start', gap: '1rem',
            }}>
              <div style={{ flex: 1 }}>
                <h2 id="mailing-list-title" style={{ fontSize: '22px', fontWeight: 700 }}>
                  Mailing List Sign Up
                </h2>
                <p style={{
                  fontSize: '14px', marginTop: '5px', lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.88)',
                }}>
                  Monthly newsletters, webinar invitations and new resources from
                  the Fletcher Group.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', color: '#ffffff',
                  fontSize: '26px', lineHeight: 1, padding: '0 4px', cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            {done ? (
              <div style={{ padding: '2rem 1.75rem', textAlign: 'center' }}>
                <p style={{
                  fontSize: '16px', fontWeight: 600, lineHeight: 1.5,
                  marginBottom: '1.5rem', color: 'var(--text-primary)',
                }}>
                  {done}
                </p>
                <button
                  type="button"
                  onClick={close}
                  style={{
                    background: 'var(--fgi-blue)', color: '#ffffff', border: 'none',
                    padding: '12px 32px', borderRadius: '999px', cursor: 'pointer',
                    fontWeight: 700, fontSize: '15px', fontFamily: 'inherit',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
                {/* Names share a row down to the narrow breakpoint, where the
                    grid collapses and they stack. */}
                <div style={{
                  display: 'grid', gap: '1rem', marginBottom: '1.125rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}>
                  <div>
                    <label htmlFor="mailing-list-first" style={LABEL}>
                      First name <span style={{ color: '#b13f08' }}>*</span>
                    </label>
                    <input
                      ref={inputRef}
                      id="mailing-list-first"
                      type="text"
                      name="FNAME"
                      autoComplete="given-name"
                      maxLength={80}
                      required
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); setError(null); }}
                      style={FIELD}
                    />
                  </div>
                  <div>
                    <label htmlFor="mailing-list-last" style={LABEL}>
                      Last name <span style={{ color: '#b13f08' }}>*</span>
                    </label>
                    <input
                      id="mailing-list-last"
                      type="text"
                      name="LNAME"
                      autoComplete="family-name"
                      maxLength={80}
                      required
                      value={lastName}
                      onChange={(e) => { setLastName(e.target.value); setError(null); }}
                      style={FIELD}
                    />
                  </div>
                </div>

                <label htmlFor="mailing-list-email" style={LABEL}>
                  Email address <span style={{ color: '#b13f08' }}>*</span>
                </label>
                <input
                  id="mailing-list-email"
                  type="email"
                  name="EMAIL"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  style={FIELD}
                />

                {/* Mailchimp's honeypot, kept from the original embed. */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-5000px' }}>
                  <input
                    type="text" tabIndex={-1} autoComplete="off"
                    name={HONEYPOT_FIELD}
                    value={trap}
                    onChange={(e) => setTrap(e.target.value)}
                  />
                </div>

                {error && (
                  <div role="alert" style={{
                    fontSize: '13px', color: '#b13f08', marginTop: '8px',
                  }}>
                    {error}
                  </div>
                )}

                <div style={{
                  display: 'flex', gap: '12px', alignItems: 'center', marginTop: '1.25rem',
                }}>
                  <button
                    type="submit"
                    disabled={sending}
                    style={{
                      background: 'var(--fgi-blue)', color: '#ffffff', border: 'none',
                      padding: '12px 32px', borderRadius: '999px',
                      fontWeight: 700, fontSize: '15px', fontFamily: 'inherit',
                      cursor: sending ? 'default' : 'pointer',
                      opacity: sending ? 0.6 : 1,
                    }}
                  >
                    {sending ? 'Subscribing…' : 'Subscribe'}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    style={{
                      background: 'none', border: 'none', fontFamily: 'inherit',
                      fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>

                {/* This audience is single opt-in — verified 8-13-26, it answers
                    "Thank you for subscribing!" rather than Mailchimp's
                    "Almost finished, confirm your email" — so do not promise a
                    confirmation email here. If Jennifer turns double opt-in on,
                    Mailchimp's own success message changes to say so and this
                    line should gain the confirmation sentence back. */}
                <p style={{
                  fontSize: '12px', color: 'var(--text-muted)',
                  marginTop: '1rem', lineHeight: 1.5,
                }}>
                  You can unsubscribe at any time using the link in any email we send.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
