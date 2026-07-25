'use client';

import { useState } from 'react';
import ResourceCard from './ResourceCard';
import type { Resource } from '@/types';

interface Props {
  /** The server-rendered page of results. */
  initial: Resource[];
  /**
   * Which page `initial` is. Normally 1, but a bookmarked or no-JS
   * `?page=N` URL renders page N — the counter has to start there or the
   * first click would fetch the wrong page.
   */
  startPage: number;
  totalPages: number;
  perPage: number;
  /** Query string for /api/resources — filters plus tenant, no page/per_page. */
  apiQuery: string;
  /** Path + query used for the no-JS href on the button (e.g. "/colorado?type=course"). */
  fallbackBase: string;
  fallbackQuery: string;
  buttonColor: string;
}

/**
 * Resource grid with an append-style "Load More" (matching PsychArmor) instead
 * of paging that replaces the results.
 *
 * Progressive enhancement: the button is a real link to `?page=N+1`, so it still
 * works without JS; the click handler intercepts and appends instead.
 *
 * Call sites must pass `key={<current filter query>}` so changing a filter
 * remounts this and resets the accumulated list.
 */
export default function ResourceGrid({
  initial, startPage, totalPages, perPage, apiQuery, fallbackBase, fallbackQuery, buttonColor,
}: Props) {
  const [items, setItems] = useState<Resource[]>(initial);
  const [page, setPage] = useState(startPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = page < totalPages;

  function hrefFor(p: number) {
    const qs = new URLSearchParams(fallbackQuery);
    qs.set('page', String(p));
    return `${fallbackBase}?${qs.toString()}`;
  }

  async function loadMore(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    const next = page + 1;
    try {
      const qs = new URLSearchParams(apiQuery);
      qs.set('page', String(next));
      qs.set('per_page', String(perPage));
      const res = await fetch(`/api/resources?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems((prev) => {
        // Belt-and-braces against a resource landing on two pages.
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...(data.resources ?? []).filter((r: Resource) => !seen.has(r.id))];
      });
      setPage(next);
    } catch {
      setError('Could not load more resources. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '4rem 2rem',
        color: 'var(--text-muted)', fontSize: '15px',
        background: 'var(--card-bg)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
      }}>
        No resources found matching your filters.
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.25rem', marginBottom: '2rem',
      }}>
        {items.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>

      {hasMore && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href={hrefFor(page + 1)}
            onClick={loadMore}
            aria-busy={loading}
            style={{
              background: buttonColor, color: '#fff',
              padding: '11px 36px', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: '15px', textDecoration: 'none',
              display: 'inline-block',
              opacity: loading ? 0.65 : 1,
              cursor: loading ? 'default' : 'pointer',
              transition: 'opacity 120ms ease',
            }}
          >
            {loading ? 'Loading…' : 'Load More'}
          </a>
          {error && (
            <div role="alert" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {error}
            </div>
          )}
        </div>
      )}
    </>
  );
}
