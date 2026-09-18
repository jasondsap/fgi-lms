'use client';

import { useState } from 'react';
import { copyText } from '@/lib/copy-text';

interface Props {
  code: string;
  title: string;
  /** Text before the code; the detail shells use "ID: ", lists pass ''. */
  prefix?: string;
}

/** What lands on the clipboard — title first so it pastes cleanly into an email. */
export function copyIdText(title: string, code: string): string {
  return `${title} (${code})`;
}

/**
 * The "ID: xxxxxx" line with a copy icon after it (Jennifer, 9-17-26): one
 * click copies the title and ID together so staff can paste a resource
 * reference into email or a ticket. Inherits the parent's font size and
 * colour so it drops into each shell's existing ID line unchanged.
 */
export default function CopyId({ code, title, prefix = 'ID: ' }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    // Confirm immediately; the write (and its textarea fallback) settles on its own.
    void copyText(copyIdText(title, code));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em' }}>
      <span>{prefix}{code}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : `Copy title and ID ${code}`}
        title={copied ? 'Copied' : 'Copy title and ID'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3em',
          padding: 0, border: 0, background: 'none', cursor: 'pointer',
          color: copied ? 'var(--fgi-blue)' : 'inherit', opacity: copied ? 1 : 0.7,
          font: 'inherit', lineHeight: 1,
        }}
      >
        {copied ? (
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
        {copied && <span style={{ fontSize: '0.8em', fontWeight: 600 }}>Copied</span>}
      </button>
    </span>
  );
}
