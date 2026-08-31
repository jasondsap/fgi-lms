'use client';

import { useEffect, useState } from 'react';
import AskLibrary from '@/components/library/AskLibrary';
import {
  GENERAL_FAQS, HELP_CATEGORIES, HELP_TOPICS, SUPPORT_EMAIL, type HelpTopic,
} from '@/lib/help-content';

/*
 * Help Center (Jason, 8-31-26; modeled on the DDOR platform's help page but
 * re-skinned in LRC style — inline styles + globals.css tokens, no Tailwind).
 * Data lives in lib/help-content.ts, shared with the help assistant, so the
 * page and Fletch can never disagree.
 *
 * Fletch's help-mode topic cards link to `#<topic-id>`; the hash effect below
 * opens that accordion so the link lands on the expanded topic.
 */

const CARD: React.CSSProperties = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="10" viewBox="0 0 18 11" aria-hidden="true"
      style={{
        flexShrink: 0, transition: 'transform 0.15s ease',
        transform: open ? 'rotate(180deg)' : 'none',
      }}
    >
      <path d="M1 1l8 8 8-8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span style={{
      width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
      background: 'var(--fgi-blue)', color: '#fff', fontSize: '12px', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
    }}>{n}</span>
  );
}

function FaqRow({
  faq, open, onToggle,
}: { faq: { q: string; a: string }; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
          width: '100%', padding: '10px 14px', background: 'none', border: 'none',
          fontFamily: 'inherit', fontSize: '14px', fontWeight: 600, textAlign: 'left',
          color: 'var(--text-primary)', cursor: 'pointer',
        }}
      >
        {faq.q}
        <Chevron open={open} />
      </button>
      {open && (
        <p style={{
          padding: '0 14px 12px', margin: 0, fontSize: '14px', lineHeight: 1.6,
          color: 'var(--text-secondary)',
        }}>
          {faq.a}
        </p>
      )}
    </div>
  );
}

export default function HelpView() {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Open the topic named by the URL hash (initial load + Fletch's card links).
  useEffect(() => {
    const applyHash = () => {
      const id = window.location.hash.replace('#', '');
      if (id && HELP_TOPICS.some((t) => t.id === id)) {
        setOpenId(id);
        // The browser has already jumped, but the accordion just grew — settle
        // the scroll on the now-open card.
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const q = search.trim().toLowerCase();
  const matches = (t: HelpTopic) => !q
    || t.name.toLowerCase().includes(q)
    || t.description.toLowerCase().includes(q)
    || t.quickStart.some((s) => s.toLowerCase().includes(q))
    || t.tips.some((s) => s.toLowerCase().includes(q))
    || t.faqs.some((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  const filtered = HELP_TOPICS.filter(matches);

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/fletch/fletch-hello.webp"
          alt=""
          style={{ width: '120px', height: 'auto', display: 'block', margin: '0 auto 8px' }}
        />
        <h1 style={{ fontSize: '34px', fontWeight: 700, color: 'var(--fgi-navy)', margin: 0 }}>
          Help Center
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: '6px 0 0' }}>
          How to use the Learning Resource Center — every feature, step by step.
        </p>
        <div style={{ maxWidth: '440px', margin: '20px auto 0' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search help topics…"
            aria-label="Search help topics"
            style={{
              width: '100%', padding: '12px 16px', fontSize: '15px', fontFamily: 'inherit',
              border: '1px solid var(--border-color)', borderRadius: '999px',
            }}
          />
        </div>
      </div>

      {/* ── Ask Fletch callout ── */}
      <div style={{
        ...CARD, borderLeft: '4px solid var(--fgi-blue)',
        display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
        padding: '14px 18px', marginBottom: '2rem',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/fletch/fletch-searching.webp" alt="" style={{ width: '56px', height: 'auto', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>Prefer to just ask?</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Click the <strong>Ask Fletch</strong> pill in the bottom-right corner and ask in your
            own words — &ldquo;how do I get my certificate?&rdquo; — and Fletch will walk you
            through it and link the right topics on this page.
          </div>
        </div>
      </div>

      {/* ── Topic catalog by category ── */}
      {HELP_CATEGORIES.map((cat) => {
        const items = filtered.filter((t) => t.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 12px' }}>
              {cat}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map((t) => {
                const open = openId === t.id;
                return (
                  <div key={t.id} id={t.id} style={{ ...CARD, scrollMarginTop: '110px' }}>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : t.id)}
                      aria-expanded={open}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '12px', width: '100%', padding: '15px 18px',
                        background: 'none', border: 'none', fontFamily: 'inherit',
                        textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)',
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '16px', fontWeight: 700 }}>{t.name}</span>
                        {!open && (
                          <span style={{
                            display: 'block', fontSize: '13.5px', color: 'var(--text-secondary)',
                            marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {t.description.split('. ')[0]}.
                          </span>
                        )}
                      </span>
                      <Chevron open={open} />
                    </button>

                    {open && (
                      <div style={{ padding: '2px 18px 18px', borderTop: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '14.5px', lineHeight: 1.65, color: 'var(--text-secondary)', margin: '12px 0 16px' }}>
                          {t.description}
                        </p>

                        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                          {t.quickStart.length > 0 && (
                            <div style={{ flex: '1 1 300px', minWidth: '260px' }}>
                              <h3 style={{
                                fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.05em', color: 'var(--fgi-navy)', margin: '0 0 10px',
                              }}>Quick Start</h3>
                              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {t.quickStart.map((s, i) => (
                                  <li key={i} style={{ display: 'flex', gap: '9px', fontSize: '14px', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                                    <StepBadge n={i + 1} />{s}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {t.tips.length > 0 && (
                            <div style={{ flex: '1 1 300px', minWidth: '260px' }}>
                              <h3 style={{
                                fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.05em', color: 'var(--fgi-navy)', margin: '0 0 10px',
                              }}>Tips</h3>
                              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {t.tips.map((tip, i) => (
                                  <li key={i} style={{ display: 'flex', gap: '9px', fontSize: '14px', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fgi-teal, #2a9d8f)"
                                      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                                      style={{ flexShrink: 0, marginTop: '3px' }}>
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {t.faqs.length > 0 && (
                          <div style={{ marginTop: '18px' }}>
                            <h3 style={{
                              fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.05em', color: 'var(--fgi-navy)', margin: '0 0 10px',
                            }}>FAQ</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {t.faqs.map((f, i) => {
                                const key = `${t.id}-${i}`;
                                return (
                                  <FaqRow
                                    key={key} faq={f} open={openFaq === key}
                                    onToggle={() => setOpenFaq(openFaq === key ? null : key)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {q && filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0' }}>
          No help topics match &ldquo;{search}&rdquo; — try Ask Fletch in the corner.
        </p>
      )}

      {/* ── General FAQ ── */}
      {!q && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 12px' }}>
            General Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {GENERAL_FAQS.map((f, i) => {
              const key = `gen-${i}`;
              return (
                <FaqRow
                  key={key} faq={f} open={openFaq === key}
                  onToggle={() => setOpenFaq(openFaq === key ? null : key)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Contact ── */}
      <div style={{ ...CARD, textAlign: 'center', padding: '26px 20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 4px' }}>
          Still need help?
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          Learning Center Support is a real person — tell us what you were trying to do.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          style={{
            display: 'inline-block', background: 'var(--fgi-blue)', color: '#fff',
            padding: '10px 26px', borderRadius: '999px', fontSize: '15px', fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Email {SUPPORT_EMAIL}
        </a>
      </div>

      {/* Fletch in help mode — answers "how do I…" from the same content. */}
      <AskLibrary mode="help" />
    </div>
  );
}
