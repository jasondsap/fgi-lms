'use client';
import { useEffect, useRef, useState } from 'react';
import {
  CONTACT_ITEM, EVALUATION_INTRO, EVALUATION_THANKS,
  RATING_ITEMS, TEXT_ITEMS,
  type RatingKey, type TextKey,
} from '@/lib/evaluation-items';

interface Props {
  slug: string;
  /** 'fgi' | 'colorado' | 'scarr' — stored with the response. */
  surface: string;
  /** Surface accent, used for the focused/selected states. */
  accent: string;
}

/** Marks this resource as already evaluated in this browser. */
const doneKey = (slug: string) => `fgi-eval:${slug}`;

const SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const QUESTION = {
  fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px',
};

const TEXTAREA = {
  width: '100%', padding: '9px 11px', fontSize: '14px', fontFamily: 'inherit',
  color: 'var(--text-primary)', background: '#ffffff',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
  resize: 'vertical' as const, minHeight: '72px',
};

/**
 * The Learning Center evaluation, as a modal off the "Share Your Feedback"
 * button on a document page.
 *
 * The same nine questions run in Moodle on every course; answers from both
 * sides land in `evaluation_responses` so they can be reported together
 * (lib/evaluation.ts). Submitting is optional here — the Moodle copy is what
 * gets made required when a certificate depends on it.
 *
 * Completion is remembered in localStorage, not in a cookie or on the server,
 * because most visitors are anonymous: it exists to stop the same person being
 * asked twice on the same machine, and nothing more rides on it.
 */
export default function FeedbackModal({ slug, surface, accent }: Props) {
  const [open, setOpen]         = useState(false);
  const [done, setDone]         = useState(false);   // submitted, this session
  const [already, setAlready]   = useState(false);   // submitted, earlier visit
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [ratings, setRatings]   = useState<Partial<Record<RatingKey, number>>>({});
  const [texts, setTexts]       = useState<Partial<Record<TextKey, string>>>({});
  const [mayContact, setMayContact] = useState<boolean | null>(null);
  const [email, setEmail]       = useState('');
  const [missing, setMissing]   = useState<string[]>([]);

  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try { setAlready(localStorage.getItem(doneKey(slug)) === '1'); } catch { /* private mode */ }
  }, [slug]);

  // Esc closes, and the page behind must not scroll under the dialog.
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
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const unanswered = [
      ...RATING_ITEMS.filter(i => ratings[i.key] === undefined).map(i => i.key as string),
      ...(mayContact === null ? [CONTACT_ITEM.key] : []),
    ];
    setMissing(unanswered);
    if (unanswered.length > 0) {
      setError('Please answer the required questions.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, surface, ratings, texts,
          may_contact: mayContact,
          contact_email: mayContact ? email : null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Your feedback could not be saved.');
      }
      try { localStorage.setItem(doneKey(slug), '1'); } catch { /* private mode */ }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your feedback could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  // The rail keeps its shape once feedback is in — a button that reopens a form
  // they already filled in is an invitation to answer twice.
  if (already && !open) {
    return (
      <div style={{
        textAlign: 'center', fontSize: '15px', fontWeight: 600,
        color: 'var(--text-secondary)', padding: '12px',
      }}>
        ✓ Thanks for your feedback
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'block', width: '100%', border: 'none',
          background: 'var(--fgi-amber)', color: '#ffffff',
          padding: '15px 12px', borderRadius: '999px',
          fontWeight: 700, fontSize: '22px', fontFamily: 'inherit',
        }}
      >
        Share Your Feedback
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="evaluation-title"
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
            width: '100%', maxWidth: '680px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'var(--fgi-navy)', color: '#ffffff',
              padding: '1.25rem 1.75rem', borderBottom: '5px solid var(--fgi-teal)',
              display: 'flex', alignItems: 'flex-start', gap: '1rem',
            }}>
              <div style={{ flex: 1 }}>
                <h2
                  id="evaluation-title" ref={headingRef} tabIndex={-1}
                  style={{ fontSize: '22px', fontWeight: 700, outline: 'none' }}
                >
                  Share Your Feedback
                </h2>
                {!done && EVALUATION_INTRO.map((line, i) => (
                  <p key={i} style={{
                    fontSize: '14px', marginTop: '5px', lineHeight: 1.5,
                    color: 'rgba(255,255,255,0.88)',
                  }}>
                    {line}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', color: '#ffffff',
                  fontSize: '26px', lineHeight: 1, padding: '0 4px',
                }}
              >
                ×
              </button>
            </div>

            {done ? (
              <div style={{ padding: '2.5rem 1.75rem', textAlign: 'center' }}>
                <p style={{ fontSize: '17px', fontWeight: 600, marginBottom: '1.5rem' }}>
                  {EVALUATION_THANKS}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    background: accent, color: '#ffffff', border: 'none',
                    padding: '12px 32px', borderRadius: '999px',
                    fontWeight: 700, fontSize: '15px', fontFamily: 'inherit',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
                {/* 0-10 scales */}
                {RATING_ITEMS.map((item) => (
                  <fieldset key={item.key} style={{ border: 'none', marginBottom: '1.5rem' }}>
                    <legend style={QUESTION}>
                      {item.prompt}
                      <span style={{ color: '#b13f08' }}> *</span>
                    </legend>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {SCALE.map((value) => {
                        const selected = ratings[item.key] === value;
                        return (
                          <label
                            key={value}
                            style={{
                              width: '38px', height: '38px', borderRadius: 'var(--radius-sm)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '14px', fontWeight: selected ? 700 : 400,
                              cursor: 'pointer',
                              background: selected ? accent : '#ffffff',
                              color: selected ? '#ffffff' : 'var(--text-primary)',
                              border: `1px solid ${selected ? accent : 'var(--border-color)'}`,
                            }}
                          >
                            <input
                              type="radio"
                              name={item.key}
                              value={value}
                              checked={selected}
                              onChange={() => {
                                setMissing(m => m.filter(k => k !== item.key));
                                setRatings(r => ({ ...r, [item.key]: value }));
                              }}
                              className="sr-only"
                            />
                            {value}
                          </label>
                        );
                      })}
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px',
                      maxWidth: '484px',
                    }}>
                      <span>Not at all</span>
                      <span>Completely</span>
                    </div>
                    {missing.includes(item.key) && (
                      <div style={{ fontSize: '12px', color: '#b13f08', marginTop: '4px' }}>
                        Please choose a number.
                      </div>
                    )}
                  </fieldset>
                ))}

                {/* Open ended */}
                {TEXT_ITEMS.map((item) => (
                  <div key={item.key} style={{ marginBottom: '1.25rem' }}>
                    <label htmlFor={`eval-${item.key}`} style={{ ...QUESTION, display: 'block' }}>
                      {item.prompt}
                    </label>
                    <textarea
                      id={`eval-${item.key}`}
                      style={TEXTAREA}
                      maxLength={2000}
                      value={texts[item.key] ?? ''}
                      onChange={(e) => setTexts(t => ({ ...t, [item.key]: e.target.value }))}
                    />
                  </div>
                ))}

                {/* Yes / No */}
                <fieldset style={{ border: 'none', marginBottom: '1.25rem' }}>
                  <legend style={QUESTION}>
                    {CONTACT_ITEM.prompt}
                    <span style={{ color: '#b13f08' }}> *</span>
                  </legend>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map((choice) => {
                      const selected = mayContact === choice.value;
                      return (
                        <label
                          key={choice.label}
                          style={{
                            padding: '8px 24px', borderRadius: '999px', cursor: 'pointer',
                            fontSize: '14px', fontWeight: selected ? 700 : 400,
                            background: selected ? accent : '#ffffff',
                            color: selected ? '#ffffff' : 'var(--text-primary)',
                            border: `1px solid ${selected ? accent : 'var(--border-color)'}`,
                          }}
                        >
                          <input
                            type="radio"
                            name={CONTACT_ITEM.key}
                            checked={selected}
                            onChange={() => {
                              setMissing(m => m.filter(k => k !== CONTACT_ITEM.key));
                              setMayContact(choice.value);
                            }}
                            className="sr-only"
                          />
                          {choice.label}
                        </label>
                      );
                    })}
                  </div>
                  {missing.includes(CONTACT_ITEM.key) && (
                    <div style={{ fontSize: '12px', color: '#b13f08', marginTop: '4px' }}>
                      Please choose Yes or No.
                    </div>
                  )}
                </fieldset>

                {/* Only asked when they've said yes — an anonymous visitor who
                    agrees to contact has given us no way to do it otherwise. */}
                {mayContact === true && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label htmlFor="eval-email" style={{ ...QUESTION, display: 'block' }}>
                      Your email address
                    </label>
                    <input
                      id="eval-email" type="email" autoComplete="email"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      style={{ ...TEXTAREA, minHeight: 0, resize: 'none' }}
                    />
                  </div>
                )}

                {error && (
                  <div style={{ fontSize: '13px', color: '#b13f08', marginBottom: '1rem' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      background: accent, color: '#ffffff', border: 'none',
                      padding: '12px 32px', borderRadius: '999px',
                      fontWeight: 700, fontSize: '15px', fontFamily: 'inherit',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Sending…' : 'Submit Feedback'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    style={{
                      background: 'none', border: 'none', fontFamily: 'inherit',
                      fontSize: '14px', color: 'var(--text-secondary)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
