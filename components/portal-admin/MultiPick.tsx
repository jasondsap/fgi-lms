'use client';

import { useEffect, useRef, useState } from 'react';

export interface PickOption { value: string; label: string; hint?: string }

/**
 * Multi-select for the Portal Admin filter form (9-19-26). The checkboxes are
 * real form inputs that stay mounted while the panel is closed, so the
 * surrounding GET form submits them like any other field — the page stays
 * server-rendered and every filter combination is a shareable URL.
 */
export default function MultiPick({
  name, label, options, selected, accent, searchable = false,
}: {
  name: string;
  label: string;
  options: PickOption[];
  selected: string[];
  accent: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set(selected));
  const [find, setFind] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const needle = find.trim().toLowerCase();
  const active = picked.size > 0;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          padding: '8px 12px', fontSize: '13.5px', fontFamily: 'inherit', cursor: 'pointer',
          borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap',
          border: `1px solid ${active ? accent : 'var(--border-color)'}`,
          background: '#fff', color: active ? accent : 'var(--text-primary)',
          fontWeight: active ? 700 : 400,
        }}
      >
        {label}{active ? ` (${picked.size})` : ''} ▾
      </button>

      <div
        role="listbox"
        aria-label={label}
        aria-multiselectable
        style={{
          display: open ? 'block' : 'none',
          position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 40,
          width: 'min(360px, 86vw)', maxHeight: '320px', overflowY: 'auto',
          background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 32px rgba(22,61,91,0.18)', padding: '8px',
        }}
      >
        {searchable && (
          <input
            type="search"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder={`Find ${label.toLowerCase()}…`}
            aria-label={`Find ${label.toLowerCase()}`}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '7px 10px', marginBottom: '6px',
              fontSize: '13px', fontFamily: 'inherit',
              border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
            }}
          />
        )}
        {active && (
          <button
            type="button"
            onClick={() => setPicked(new Set())}
            style={{
              background: 'none', border: 'none', padding: '2px 4px 6px', cursor: 'pointer',
              fontSize: '12.5px', fontFamily: 'inherit', color: accent, textDecoration: 'underline',
            }}
          >
            Clear {picked.size} selected
          </button>
        )}
        {options.map((o) => {
          const hidden = needle !== '' && !`${o.label} ${o.hint ?? ''}`.toLowerCase().includes(needle);
          return (
            <label
              key={o.value}
              style={{
                display: hidden ? 'none' : 'flex', gap: '8px', alignItems: 'flex-start',
                padding: '5px 4px', fontSize: '13.5px', cursor: 'pointer', lineHeight: 1.35,
              }}
            >
              <input
                type="checkbox"
                name={name}
                value={o.value}
                checked={picked.has(o.value)}
                onChange={() => toggle(o.value)}
                style={{ marginTop: '2px', accentColor: accent }}
              />
              <span>
                {o.label}
                {o.hint && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}> · {o.hint}</span>}
              </span>
            </label>
          );
        })}
        {options.length === 0 && (
          <div style={{ padding: '8px 4px', fontSize: '13px', color: 'var(--text-muted)' }}>Nothing to choose yet.</div>
        )}
      </div>
    </div>
  );
}
