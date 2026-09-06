'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RESOURCE_TYPE_COLORS, RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

interface Recommendation {
  slug: string;
  title: string;
  type: string;
  durationMinutes: number | null;
  isNaadacCe: boolean;
  why: string;
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
}

interface Props {
  /** '' on FGI, '/colorado' or '/scarr' on a tenant portal. */
  basePath?: string;
  /** Surface key sent to the API so recommendations stay in-surface. */
  surface?: string;
  /** Panel accent colour for this surface (header, bubbles, Ask button). */
  accent?: string;
  /** Closed-pill colours — FGI gold per Jennifer 8-17-26; tenants pass their primary. */
  pillBg?: string;
  pillText?: string;
  /** 'library' (default) recommends resources; 'help' (the /help page, 8-31-26)
      answers how-to questions and links Help Center topics as `#<id>` anchors. */
  mode?: 'library' | 'help';
}

const STARTERS = [
  'I run a recovery house and neighbors are pushing back',
  'I need to train new peer support staff',
  'How do I fund a new recovery residence?',
];

const HELP_STARTERS = [
  'How do I get my CE certificate?',
  "Why isn't my video marked complete?",
  'How do I download my transcript?',
];

/**
 * Floating "Ask the library" assistant. Describes a situation in plain language
 * and gets back resources from this surface's catalog.
 *
 * Links are built from server-validated slugs — the API drops anything not in
 * the catalog, so every card here points at a real resource.
 */
export default function AskLibrary({
  basePath = '',
  surface = 'fgi',
  accent = 'var(--fgi-blue)',
  pillBg = 'var(--fgi-gold)',
  pillText = 'var(--fgi-navy)',
  mode = 'library',
}: Props) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns, loading]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  /** Wipe the chat back to Fletch's greeting; the panel stays open. */
  function resetConversation() {
    if (loading) return;
    setTurns([]);
    setError(null);
    setInput('');
    inputRef.current?.focus();
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;

    const next: Turn[] = [...turns, { role: 'user', content: q }];
    setTurns(next);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(mode === 'help' ? '/api/help-assistant' : '/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(mode === 'help' ? {} : { surface }),
          messages: next.map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      // Help mode returns topics; shape them into the same card model — the
      // category becomes the type pill, the topic id the in-page anchor.
      const cards: Recommendation[] = mode === 'help'
        ? (data.topics ?? []).map((t: { id: string; name: string; category: string; why: string }) => ({
            slug: t.id, title: t.name, type: t.category,
            durationMinutes: null, isNaadacCe: false, why: t.why,
          }))
        : data.recommendations ?? [];
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, recommendations: cards },
      ]);
    } catch {
      setError('Could not reach the assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    // Fletch the owl (new character art, 9-3-26) perches on the pill's top
    // edge; the whole thing is one button so his feathers are clickable too.
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask Fletch"
        className="fletch-launcher"
        style={{
          position: 'fixed', zIndex: 200,
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/fletch/fletch-hello.webp"
          alt=""
          className="fletch-launcher__owl"
          style={{
            height: 'auto', marginBottom: '-12px', marginRight: '10px',
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))', pointerEvents: 'none',
          }}
        />
        <span className="fletch-launcher__pill" style={{
          background: pillBg, color: pillText,
          borderRadius: '999px', fontWeight: 600,
          boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
        }}>
          Ask Fletch
        </span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Ask Fletch"
      className="fletch-panel"
      style={{
        position: 'fixed', zIndex: 200,
        width: 'min(420px, calc(100vw - 32px))', maxHeight: 'min(620px, calc(100vh - 48px))',
        display: 'flex', flexDirection: 'column',
        background: '#fff', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 34px rgba(0,0,0,0.20)',
        overflow: 'hidden',
      }}
    >
      <header style={{
        background: accent, color: '#fff', padding: '13px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/fletch/fletch-hello.webp"
            alt=""
            style={{ width: '44px', height: 'auto', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Ask Fletch</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              {mode === 'help'
                ? 'Ask how to use the Learning Resource Center'
                : <>Describe what you&#39;re working on or resources you&#39;re looking for</>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* New-conversation reset (Jason 8-31-26) — only once there is
              something to clear; wipes turns/error so the greeting returns. */}
          {(turns.length > 0 || error) && (
            <button
              onClick={resetConversation}
              title="Start a new conversation"
              style={{
                background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.45)',
                color: '#fff', borderRadius: '999px', padding: '4px 11px',
                fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                lineHeight: 1.4, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              ↺ Start over
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', color: '#fff',
              fontSize: '22px', lineHeight: 1, cursor: 'pointer', padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', background: 'var(--body-bg)' }}>
        {turns.length === 0 && (
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/fletch/fletch-hello.webp"
              alt=""
              style={{ width: '120px', height: 'auto', display: 'block', margin: '4px auto 10px' }}
            />
            <p style={{ marginBottom: '12px' }}>
              {mode === 'help'
                ? <>Hi, I&#39;m Fletch! Ask me how to do anything here and I&#39;ll walk you through it.</>
                : <>Hi, I&#39;m Fletch! Tell me the situation you&#39;re facing and I&#39;ll
                  point you to what we have.</>}
            </p>
            {(mode === 'help' ? HELP_STARTERS : STARTERS).map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', marginBottom: '7px',
                  background: '#fff', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', padding: '9px 12px',
                  fontSize: '13px', fontFamily: 'inherit', color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {turns.map((t, i) =>
          t.role === 'user' ? (
            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <div style={{
                background: accent, color: '#fff', borderRadius: '14px 14px 3px 14px',
                padding: '9px 13px', fontSize: '14px', maxWidth: '85%', lineHeight: 1.5,
              }}>
                {t.content}
              </div>
            </div>
          ) : (
            <div key={i} style={{ marginBottom: '16px' }}>
              {t.content && (
                <div style={{
                  background: '#fff', border: '1px solid var(--border-color)',
                  borderRadius: '14px 14px 14px 3px', padding: '10px 13px',
                  fontSize: '14px', lineHeight: 1.6, marginBottom: '10px',
                }}>
                  {t.content}
                </div>
              )}
              {t.recommendations?.map((r) => {
                const color = RESOURCE_TYPE_COLORS[r.type as ResourceType] ?? accent;
                const label = RESOURCE_TYPE_LABELS[r.type as ResourceType] ?? r.type;
                return (
                  <Link
                    key={r.slug}
                    href={mode === 'help' ? `#${r.slug}` : `${basePath}/resource/${r.slug}`}
                    style={{
                      display: 'block', textDecoration: 'none', color: 'inherit',
                      background: '#fff', border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${color}`,
                      borderRadius: 'var(--radius-md)', padding: '10px 13px', marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '7px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: color, color: '#fff', fontSize: '10px', fontWeight: 700,
                        padding: '2px 7px', borderRadius: '3px', textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>{label}</span>
                      {r.isNaadacCe && (
                        <span style={{
                          background: 'var(--fgi-amber)', color: 'var(--fgi-navy)', fontSize: '10px',
                          fontWeight: 700, padding: '2px 6px', borderRadius: '3px',
                        }}>NAADAC CE</span>
                      )}
                      {r.durationMinutes && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {r.durationMinutes} min
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px', lineHeight: 1.35, marginBottom: '3px' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {r.why}
                    </div>
                  </Link>
                );
              })}
            </div>
          ),
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 2px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/fletch/fletch-searching.webp"
              alt=""
              style={{ width: '60px', height: 'auto' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {mode === 'help' ? 'Fletch is checking the guide…' : 'Fletch is looking through the library…'}
            </span>
          </div>
        )}
        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/fletch/fletch-break.webp"
              alt=""
              style={{ width: '64px', height: 'auto', flexShrink: 0 }}
            />
            <div style={{
              fontSize: '13px', color: '#8a1c1c', background: '#fdf0f0',
              border: '1px solid #f2d4d4', borderRadius: 'var(--radius-md)', padding: '9px 12px',
            }}>
              {error}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        style={{
          display: 'flex', gap: '8px', padding: '11px 12px', flexShrink: 0,
          borderTop: '1px solid var(--border-color)', background: '#fff',
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'help' ? 'What do you need help with?' : 'What are you working on?'}
          maxLength={1000}
          style={{
            flex: 1, padding: '9px 12px', fontSize: '14px', fontFamily: 'inherit',
            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            background: accent, color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '9px 17px',
            fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
            cursor: loading || !input.trim() ? 'default' : 'pointer',
            opacity: loading || !input.trim() ? 0.55 : 1,
          }}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
