'use client';
import { useState } from 'react';
import { markWelcomeSeenAction } from './welcome-actions';

/**
 * One-time launch welcome (9-1-26 go-live): a short card sequence shown once
 * per account after sign-in — welcome message, then getting-started tips.
 * Any dismissal (×, Skip, or finishing the cards) marks it seen in the DB,
 * so it never reappears, on any device.
 *
 * ALL COPY LIVES IN `CARDS` below — edit there. Card 1 is Jennifer's launch
 * message reframed per Jason (momentum, not "finishing touches").
 */

interface Card {
  title: string;
  intro?: string;
  bullets?: string[];
  outro?: string;
}

const CARDS: Card[] = [
  {
    title: 'Welcome to the New Learning Resource Center!',
    intro:
      'The new & improved Learning Resource Center is open! Courses, webinars, ' +
      'podcasts, learning briefs, and a full library of recovery ecosystem ' +
      'resources — all in one place, ready whenever you are.',
    outro:
      'We’re adding new features and content in the weeks ahead, so check ' +
      'back often. We’re excited you’re here — happy exploring!',
  },
  {
    title: 'Find What You Need',
    bullets: [
      'Browse the Library and use the filters to narrow by who you are or what you want to learn about.',
      'Search understands related terms — type what you mean and it will find it.',
      'Not sure where to start? Click Ask Fletch in the bottom corner, describe what you’re working on, and get personal recommendations.',
    ],
  },
  {
    title: 'Track Your Learning',
    bullets: [
      'Course progress saves automatically — leave anytime and pick up right where you stopped.',
      'Complete every item in a course to earn your Certificate of Completion; look for the NAADAC CE badge for CE credit.',
      'Find your progress, bookmarks, and CE transcript under My Learning in the account menu.',
      'Questions? Click the ? in the header anytime.',
    ],
  },
];

export default function WelcomeCards() {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(true);
  const last = idx === CARDS.length - 1;
  const card = CARDS[idx];

  const dismiss = () => {
    setOpen(false);
    // Fire-and-forget — the modal closes instantly either way.
    void markWelcomeSeenAction();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to the Learning Resource Center"
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(22, 61, 91, 0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{
        background: '#ffffff', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: '480px',
        boxShadow: '0 14px 44px rgba(0,0,0,0.3)', overflow: 'hidden',
      }}>
        <div style={{
          background: 'var(--fgi-navy)', padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '4px solid var(--fgi-gold)',
        }}>
          <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px' }}>
            Learning Resource Center
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', color: '#ffffff',
              fontSize: '22px', lineHeight: 1, cursor: 'pointer', padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '22px 26px 20px', minHeight: '240px' }}>
          <h2 style={{
            fontSize: '21px', fontWeight: 700, color: 'var(--fgi-navy)',
            margin: '0 0 12px', lineHeight: 1.25,
          }}>
            {card.title}
          </h2>
          {card.intro && (
            <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              {card.intro}
            </p>
          )}
          {card.bullets && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {card.bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '14.5px', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                  <span aria-hidden style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'var(--fgi-gold)', flexShrink: 0, marginTop: '7px',
                  }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {card.outro && (
            <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--text-primary)', margin: '12px 0 0' }}>
              {card.outro}
            </p>
          )}
        </div>

        <div style={{
          padding: '0 26px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '7px' }}>
            {CARDS.map((_, i) => (
              <span key={i} aria-hidden style={{
                width: '9px', height: '9px', borderRadius: '50%',
                background: i === idx ? 'var(--fgi-navy)' : 'var(--border-color)',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {idx > 0 ? (
              <button
                onClick={() => setIdx((i) => i - 1)}
                style={{
                  background: 'none', border: 'none', padding: '8px 6px', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                Back
              </button>
            ) : (
              <button
                onClick={dismiss}
                style={{
                  background: 'none', border: 'none', padding: '8px 6px', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                Skip
              </button>
            )}
            <button
              onClick={() => (last ? dismiss() : setIdx((i) => i + 1))}
              style={{
                background: 'var(--fgi-blue)', color: '#ffffff', border: 'none',
                borderRadius: '999px', padding: '10px 24px', fontSize: '14px',
                fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {last ? 'Start Exploring' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
