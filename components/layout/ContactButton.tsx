'use client';

/*
 * "Contact Us" pill with the paper-plane glyph, from the 8-10-26 mockup. It
 * appears in the grey support bar under the hero, the navy footer block, the
 * detail-shell footers, and the tenant landings' support bars, so it lives
 * here rather than being written out several times.
 *
 * Since 8-31-26 (Jennifer/Jason) it opens the Question/Problem ticket modal
 * instead of a mailto: — every contact route lands in the one queue the LC@
 * team works. Signed-out visitors never reach the modal: SignedOutGate
 * intercepts the click and opens the login modal instead, which is exactly
 * the split we want (tickets need a session for identity).
 */
import { useState } from 'react';
import ReportProblemModal from '@/components/support/ReportProblemModal';

export default function ContactButton({
  label = 'Contact Us',
  fontSize = '17px',
  bg = 'var(--fgi-blue)',
  fg = '#ffffff',
  basePath = '',
  accent = 'var(--fgi-blue)',
}: {
  label?: string;
  fontSize?: string;
  bg?: string;
  fg?: string;
  /** '' on FGI, '/scarr' etc. on a tenant — keeps ticket links in-chrome. */
  basePath?: string;
  /** Modal button colour (tenants pass their primary). */
  accent?: string;
} = {}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '9px',
          background: bg,
          color: fg,
          fontSize,
          fontWeight: 400,
          fontFamily: 'inherit',
          border: 'none',
          cursor: 'pointer',
          padding: '10px 22px',
          borderRadius: '999px',
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M2.5 11.1 20.6 3.3c.8-.3 1.5.4 1.2 1.2l-7.8 18.1c-.3.8-1.5.8-1.7-.1l-1.9-7-7-1.9c-.9-.2-.9-1.4-.1-1.7z" />
        </svg>
        {label}
      </button>
      <ReportProblemModal open={open} onClose={() => setOpen(false)} basePath={basePath} accent={accent} />
    </>
  );
}
