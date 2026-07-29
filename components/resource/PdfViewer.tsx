'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Inline presigned URL — must NOT carry an attachment disposition. */
  url: string;
  /** Resource title, used as the iframe's accessible name. */
  title: string;
  /** Short type label for the card header, e.g. "Newsletter". */
  label: string;
  /** Surface accent colour so tenant portals keep their own palette. */
  accent: string;
}

/**
 * Below this width the built-in PDF viewers in iOS Safari and Android Chrome
 * refuse to render inside an iframe — they paint an empty box or a "can't
 * preview" placeholder. An absent viewer reads better than a broken one, so
 * narrow viewports fall back to the sidebar buttons.
 */
const MIN_WIDTH = 900;

/** Height of the viewer when inline. Roughly one letter-size page on screen. */
const INLINE_HEIGHT = 820;

export default function PdfViewer({ url, title, label, accent }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState<boolean | null>(null);
  // 'native' is the real Fullscreen API; 'overlay' is the CSS fallback used
  // when the browser refuses it (enterprise policy, embedded webviews, and
  // automation contexts all reject requestFullscreen with "not granted").
  const [expanded, setExpanded] = useState<null | 'native' | 'overlay'>(null);

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Track native fullscreen from the document rather than from the click, so
  // pressing Esc — which never fires our handler — still restores the layout.
  useEffect(() => {
    const sync = () => {
      const active = document.fullscreenElement
        ?? (document as any).webkitFullscreenElement
        ?? null;
      setExpanded(current =>
        active === wrapperRef.current ? 'native' : (current === 'native' ? null : current)
      );
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  // The overlay is not a real fullscreen, so Esc has to be wired up by hand to
  // match what the native path gives us for free.
  useEffect(() => {
    if (expanded !== 'overlay') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(null);
    };
    document.addEventListener('keydown', onKey);
    // Stop the page behind the overlay from scrolling under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  const toggleExpanded = () => {
    const element = wrapperRef.current as any;
    if (!element) return;

    if (expanded) {
      if (expanded === 'native') {
        (document.exitFullscreen ?? (document as any).webkitExitFullscreen)?.call(document);
      }
      setExpanded(null);
      return;
    }

    const request = element.requestFullscreen ?? element.webkitRequestFullscreen;
    const result = request?.call(element);

    // Chrome returns a promise; older WebKit returns undefined and succeeds
    // synchronously, in which case fullscreenchange sets the state for us.
    if (result?.catch) result.catch(() => setExpanded('overlay'));
    else if (!request) setExpanded('overlay');
  };

  // `null` means the width check has not run yet — render nothing rather than
  // flashing a viewer that a phone is about to discard.
  if (!wide) return null;

  const isOverlay = expanded === 'overlay';
  const isFull    = expanded !== null;

  return (
    <div
      ref={wrapperRef}
      style={{
        border: isFull ? 'none' : '1px solid var(--border-color)',
        borderRadius: isFull ? 0 : '8px',
        overflow: 'hidden',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: isFull ? '100%' : undefined,
        ...(isOverlay ? {
          position: 'fixed' as const,
          inset: 0,
          zIndex: 2000,
        } : null),
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', padding: '0.875rem 1.5rem',
        borderBottom: '1px solid var(--border-color)', flexShrink: 0,
      }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--text-muted)',
        }}>
          {label}
        </div>
        <button
          type="button"
          onClick={toggleExpanded}
          style={{
            background: 'none', border: `1.5px solid ${accent}`, color: accent,
            borderRadius: 'var(--radius-sm)', padding: '5px 12px',
            fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          {isFull ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>

      {/*
        The fragment asks the built-in viewer to fit the page width and to drop
        its own chrome (toolbar + side panel), since our header already carries
        the controls we want. Chrome/Edge honour toolbar/navpanes; Firefox and
        Safari ignore them and keep their toolbars, which is a harmless no-op.
        Fragments are never sent to S3, so this cannot invalidate the signature.
        Toggling fullscreen only changes style here — the iframe keeps its
        position in the tree, so the PDF is never re-fetched.
      */}
      <iframe
        src={`${url}#toolbar=0&navpanes=0&view=FitH`}
        title={title}
        style={{
          display: 'block', width: '100%', border: 'none',
          height: isFull ? 'auto' : `${INLINE_HEIGHT}px`,
          flex: isFull ? 1 : undefined,
        }}
      />
    </div>
  );
}
