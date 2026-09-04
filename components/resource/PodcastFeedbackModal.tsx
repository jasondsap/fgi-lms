'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * The podcast's Share Your Feedback (8-30-26): same modal chrome as the
 * Learning Center evaluation (FeedbackModal), but the body is Jennifer's
 * Monday.com podcast form in an iframe — the podcast deliberately runs its
 * own instrument ("Evaluation for everything except the Podcast"). Only the
 * `/forms/embed/` variant may be framed; the plain form URL sends
 * frame-ancestors limited to Monday's own domains.
 */
export default function PodcastFeedbackModal({
  embedUrl,
  fallbackUrl,
  button,
}: {
  embedUrl: string;
  fallbackUrl: string;
  /** Pill colours — see Surface.feedbackButton. */
  button: { bg: string; fg: string };
}) {
  const [open, setOpen] = useState(false);
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
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'block', width: '100%', border: 'none',
          background: button.bg, color: button.fg,
          padding: '10px 22px', borderRadius: '999px',
          fontWeight: 700, fontSize: '16px', fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        Share Your Feedback
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="podcast-feedback-title"
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
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Header — identical chrome to the Learning Center evaluation */}
            <div style={{
              background: 'var(--fgi-navy)', color: '#ffffff',
              padding: '1.25rem 1.75rem', borderBottom: '5px solid var(--fgi-teal)',
              display: 'flex', alignItems: 'flex-start', gap: '1rem',
            }}>
              <div style={{ flex: 1 }}>
                <h2
                  id="podcast-feedback-title" ref={headingRef} tabIndex={-1}
                  style={{ fontSize: '22px', fontWeight: 700, outline: 'none' }}
                >
                  Share Your Feedback
                </h2>
                <p style={{
                  fontSize: '14px', marginTop: '5px', lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.88)',
                }}>
                  Tell us what you think of Recovery Ecosystem Radio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', color: '#ffffff',
                  fontSize: '26px', lineHeight: 1, padding: '0 4px', cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <iframe
              src={embedUrl}
              title="Podcast feedback form"
              style={{
                width: '100%', height: 'min(62vh, 560px)', border: 'none',
                display: 'block', background: '#ffffff',
              }}
            />

            <div style={{
              padding: '10px 1.75rem 14px', fontSize: '13px',
              color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)',
            }}>
              Trouble with the form?{' '}
              <a
                href={fallbackUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--fgi-blue)' }}
              >
                Open it in a new tab
              </a>
              .
            </div>
          </div>
        </div>
      )}
    </>
  );
}
