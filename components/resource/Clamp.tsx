'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The one truncation rule for shell descriptions, abstracts and bios
 * (Jennifer, 8-29-26: "set a standard… then make expandable… consistent
 * across all"). Clamps to `lines` and shows Read more / Read less in the
 * surface colour — but only when the text actually overflows, so a short
 * description never carries a dead link. Paragraph breaks (blank lines) are
 * kept. The full text is always in the DOM for selection and search.
 */
export default function Clamp({
  text,
  lines = 6,
  accent,
  fontSize = '17px',
  lineHeight = 1.5,
  color = 'var(--text-primary)',
}: {
  text: string;
  lines?: number;
  accent: string;
  fontSize?: string;
  lineHeight?: number;
  color?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Measure once laid out (and again on resize): does the clamped box hide anything?
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, lines]);

  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div>
      <div
        ref={ref}
        style={{
          fontSize, lineHeight, color,
          ...(expanded ? {} : {
            display: '-webkit-box',
            WebkitLineClamp: lines,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }),
        }}
      >
        {paragraphs.map((para, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : '0.75em 0 0' }}>{para}</p>
        ))}
      </div>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            marginTop: '8px', padding: 0, border: 'none', background: 'none',
            color: accent, fontWeight: 700, fontSize: '14px',
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
