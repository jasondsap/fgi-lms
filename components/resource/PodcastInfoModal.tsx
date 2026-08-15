'use client';
import { useEffect, useRef, useState } from 'react';
import type { PodcastInfoSection } from '@/lib/podcast';

/**
 * The podcast shell's three pop-open buttons — "About The Podcast", "Who
 * should listen" and "What is a Recovery Ecosystem?" (8-12-26 mockup). Each is
 * a styled button that opens the same modal chrome as FeedbackModal, filled
 * with static copy from lib/podcast.ts rather than a form.
 */

type Variant = 'amber' | 'navy' | 'sky';

const BUTTON: Record<Variant, React.CSSProperties> = {
  // Gold rounded rect, navy bold italic — "About The Podcast" / "Trailer"
  amber: {
    background: 'var(--fgi-amber)', color: 'var(--fgi-navy)',
    fontWeight: 700, fontStyle: 'italic', fontSize: '19px',
    borderRadius: 'var(--radius-md)', padding: '8px 22px',
  },
  // Navy pill, white bold — "Who should listen"
  navy: {
    background: 'var(--fgi-navy)', color: '#ffffff',
    fontWeight: 700, fontSize: '19px',
    borderRadius: 'var(--radius-md)', padding: '8px 20px',
  },
  // Light-blue pill, white bold — "What is a Recovery Ecosystem?"
  sky: {
    background: 'var(--fgi-teal)', color: '#ffffff',
    fontWeight: 700, fontSize: '18px',
    borderRadius: 'var(--radius-md)', padding: '8px 18px',
  },
};

interface Props {
  label: string;
  /** Modal heading; defaults to the button label. */
  title?: string;
  variant: Variant;
  sections: PodcastInfoSection[];
  /** Stretch the button to its container (rail buttons) or shrink-wrap it. */
  fullWidth?: boolean;
}

export default function PodcastInfoModal(
  { label, title, variant, sections, fullWidth = false }: Props,
) {
  const [open, setOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          border: 'none', fontFamily: 'inherit',
          display: fullWidth ? 'block' : 'inline-block',
          width: fullWidth ? '100%' : undefined,
          ...BUTTON[variant],
        }}
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="podcast-info-title"
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
            width: '100%', maxWidth: '640px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden',
          }}>
            <div style={{
              background: 'var(--fgi-navy)', color: '#ffffff',
              padding: '1.25rem 1.75rem', borderBottom: '5px solid var(--fgi-teal)',
              display: 'flex', alignItems: 'flex-start', gap: '1rem',
            }}>
              <h2
                id="podcast-info-title" ref={headingRef} tabIndex={-1}
                style={{ fontSize: '22px', fontWeight: 700, outline: 'none', flex: 1 }}
              >
                {title ?? label}
              </h2>
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

            <div style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
              {sections.map((section, si) => (
                <div key={si} style={{ marginBottom: si < sections.length - 1 ? '1.5rem' : 0 }}>
                  {section.heading && (
                    <div style={{
                      fontSize: '17px', fontWeight: 700,
                      color: 'var(--text-primary)', marginBottom: '0.5rem',
                    }}>
                      {section.heading}
                    </div>
                  )}
                  {section.blocks.map((block, bi) =>
                    Array.isArray(block) ? (
                      <ul key={bi} style={{ margin: '0 0 0.9rem', paddingLeft: '1.4rem' }}>
                        {block.map((item) => (
                          <li key={item} style={{
                            fontSize: '15px', lineHeight: 1.6, color: 'var(--text-primary)',
                          }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p key={bi} style={{
                        fontSize: '15px', lineHeight: 1.65, color: 'var(--text-primary)',
                        marginBottom: '0.9rem',
                      }}>
                        {block}
                      </p>
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
