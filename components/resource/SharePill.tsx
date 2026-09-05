'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  description?: string | null;
  /** Surface primary colour — outline pill, like "Back to Library". */
  accent: string;
}

/**
 * "Share" pill on every resource page (Rachael's ticket, 9-5-26: "how can I
 * send a direct link to a single resource to a client?"). Two rows: copy the
 * page URL, or open the user's own mail app with a prefilled note. The mail
 * goes out from the sharer's address on purpose — the client recognises the
 * sender and replies reach them, and nothing is relayed through us. A third
 * row offers the device share sheet where the browser has one (phones).
 *
 * The shared URL is the current page, which is already surface-correct: a
 * Colorado user hands out the Colorado copy and the client lands in Colorado
 * chrome instead of a surface-enforcement 404.
 */
export default function SharePill({ title, description, accent }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Origin + path only: drop ?from= and #hash noise before handing it out.
  const pageUrl = () => `${window.location.origin}${window.location.pathname}`;

  const blurb = (description || '').replace(/\s+/g, ' ').trim();
  const short = blurb.length > 220 ? `${blurb.slice(0, 217).trimEnd()}…` : blurb;

  const copy = async () => {
    const url = pageUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older/locked-down browsers: fall back to a hidden textarea.
      const ta = document.createElement('textarea');
      ta.value = url; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    }
    setCopied(true);
    setOpen(false);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const mailto = () => {
    const url = pageUrl();
    const subject = `${title} — Fletcher Group Learning Resource Center`;
    const body = [
      'I thought you might find this useful:',
      '',
      title,
      ...(short ? [short] : []),
      '',
      url,
      '',
      'Shared from the Fletcher Group Learning Resource Center. Opening it takes a free account — creating one only takes a minute.',
    ].join('\n');
    window.location.href =
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpen(false);
  };

  const native = async () => {
    setOpen(false);
    try {
      await navigator.share({ title, text: short || title, url: pageUrl() });
    } catch {
      // User dismissed the sheet — nothing to do.
    }
  };

  const row = {
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
    padding: '10px 14px', border: 'none', background: 'transparent',
    fontFamily: 'inherit', fontSize: '15px', fontWeight: 600, textAlign: 'left' as const,
    color: 'var(--text-primary)', cursor: 'pointer',
  };
  const icon = {
    width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
    stroke: accent, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style: { flexShrink: 0 },
  };

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: '100%', padding: '10px 22px', borderRadius: '999px',
          border: `1.5px solid ${accent}`, background: copied ? accent : 'transparent',
          color: copied ? '#ffffff' : accent,
          fontWeight: 700, fontSize: '16px', fontFamily: 'inherit',
          transition: 'background 120ms, color 120ms',
        }}
      >
        {copied ? (
          <>
            <svg {...icon} stroke="#ffffff"><path d="M20 6L9 17l-5-5" /></svg>
            Link copied
          </>
        ) : (
          <>
            <svg {...icon}>
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
            </svg>
            Share This Resource
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', left: 0, right: 0, top: 'calc(100% + 8px)', zIndex: 20,
            background: '#ffffff', borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)', padding: '6px 0', overflow: 'hidden',
          }}
        >
          <button type="button" role="menuitem" onClick={copy} style={row}>
            <svg {...icon}>
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy link
          </button>
          <button type="button" role="menuitem" onClick={mailto} style={row}>
            <svg {...icon}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 6l-10 7L2 6" />
            </svg>
            Email this link
          </button>
          {canShare && (
            <button type="button" role="menuitem" onClick={native} style={row}>
              <svg {...icon}>
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              More ways to share…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
