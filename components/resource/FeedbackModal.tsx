'use client';
import { useEffect, useRef, useState } from 'react';
import EvaluationForm from '@/components/resource/EvaluationForm';
import { EVALUATION_INTRO, EVALUATION_THANKS } from '@/lib/evaluation-items';

interface Props {
  slug: string;
  /** 'fgi' | 'colorado' | 'scarr' — stored with the response. */
  surface: string;
  /** Surface accent, used for the focused/selected states. */
  accent: string;
}

/** Marks this resource as already evaluated in this browser. */
const doneKey = (slug: string) => `fgi-eval:${slug}`;

/**
 * The Learning Center evaluation, as a modal off the "Share Your Feedback"
 * button on a document page. The nine questions themselves live in
 * EvaluationForm (8-30-26), shared with the course player so both run the
 * identical instrument into `evaluation_responses`.
 *
 * Completion is remembered in localStorage, not in a cookie or on the server,
 * because most visitors are anonymous: it exists to stop the same person being
 * asked twice on the same machine, and nothing more rides on it.
 */
export default function FeedbackModal({ slug, surface, accent }: Props) {
  const [open, setOpen]         = useState(false);
  const [done, setDone]         = useState(false);   // submitted, this session
  const [already, setAlready]   = useState(false);   // submitted, earlier visit

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

  const onDone = () => {
    try { localStorage.setItem(doneKey(slug), '1'); } catch { /* private mode */ }
    setDone(true);
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
          padding: '10px 22px', borderRadius: '999px',
          fontWeight: 700, fontSize: '16px', fontFamily: 'inherit',
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
              <div style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
                <EvaluationForm
                  slug={slug}
                  surface={surface}
                  accent={accent}
                  onDone={onDone}
                  onCancel={() => setOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
