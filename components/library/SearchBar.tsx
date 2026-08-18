'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

interface Props { defaultValue?: string; targetPath?: string; }

export default function SearchBar({ defaultValue, targetPath = '/' }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = inputRef.current?.value.trim() || '';
    const params = new URLSearchParams(searchParams.toString());
    if (val) { params.set('search', val); } else { params.delete('search'); }
    params.set('page', '1');
    router.push(`${targetPath}?${params.toString()}`);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = '';
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.set('page', '1');
    router.push(`${targetPath}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            defaultValue={defaultValue}
            placeholder="Keyword Search"
            style={{
              width: '100%', padding: '9px 14px 9px 38px', fontSize: '14px',
              border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
              outline: 'none', fontFamily: 'var(--font-sans)', background: 'var(--card-bg)',
            }}
          />
          {/* Stroke SVG, not the 🔍 emoji — the emoji renders in the OS's own
              colours and clashed with the site palette (Jennifer, 8-17). */}
          <button type="submit" aria-label="Search" style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center',
          }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
        {defaultValue && (
          <button type="button" onClick={handleClear} style={{
            background: 'none', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', padding: '9px 14px',
            fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Clear</button>
        )}
      </div>
    </form>
  );
}
