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
  /** Button / accent colour for this surface. */
  accent?: string;
}

const STARTERS = [
  'I run a recovery house and neighbours are pushing back',
  'I need to train new peer support staff',
  'How do I fund a new recovery residence?',
];

/**
 * Floating "Ask the library" assistant. Describes a situation in plain language
 * and gets back resources from this surface's catalog.
 *
 * Links are built from server-validated slugs — the API drops anything not in
 * the catalog, so every card here points at a real resource.
 */
export default function AskLibrary({ basePath = '', surface = 'fgi', accent = 'var(--fgi-blue)' }: Props) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns, loading]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;

    const next: Turn[] = [...turns, { role: 'user', content: q }];
    setTurns(next);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surface,
          messages: next.map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, recommendations: data.recommendations ?? [] },
      ]);
    } catch {
      setError('Could not reach the assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask the library"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
          background: accent, color: '#fff', border: 'none',
          borderRadius: '999px', padding: '13px 22px',
          fontSize: '15px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
        }}
      >
        Ask the library
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Ask the library"
      style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
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
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>Ask the library</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Describe what you&#39;re working on</div>
        </div>
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
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', background: 'var(--body-bg)' }}>
        {turns.length === 0 && (
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '12px' }}>
              Tell me the situation you&#39;re facing and I&#39;ll point you to what we have.
            </p>
            {STARTERS.map((s) => (
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
                    href={`${basePath}/resource/${r.slug}`}
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
                          background: 'var(--fgi-blue)', color: '#fff', fontSize: '10px',
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
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '4px 2px' }}>
            Looking through the library…
          </div>
        )}
        {error && (
          <div role="alert" style={{
            fontSize: '13px', color: '#8a1c1c', background: '#fdf0f0',
            border: '1px solid #f2d4d4', borderRadius: 'var(--radius-md)', padding: '9px 12px',
          }}>
            {error}
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
          placeholder="What are you working on?"
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
