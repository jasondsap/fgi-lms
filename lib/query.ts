/**
 * Flatten Next.js `searchParams` into a query string, dropping `page` and
 * `loaded` (the Load-More depth stamp, 8-31-26 — position state, not a filter).
 *
 * Used to build both the no-JS "Load More" href and the /api/resources query
 * behind the append-style grid, so the two never drift apart.
 *
 * `extra` fills in params the page knows but the URL doesn't — notably `tenant`
 * on the /colorado and /scarr landing pages, where the surface is implied by
 * the route rather than a query param.
 */
export function filterQuery(
  searchParams: { [key: string]: string | string[] | undefined },
  extra?: Record<string, string | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === 'page' || k === 'loaded' || v === undefined) continue;
    if (Array.isArray(v)) v.forEach((val) => qs.append(k, val));
    else qs.append(k, v);
  }
  for (const [k, v] of Object.entries(extra ?? {})) {
    if (v !== undefined && !qs.has(k)) qs.set(k, v);
  }
  return qs.toString();
}

/**
 * How many Load-More pages the visitor had accumulated, from `?loaded=N`
 * (stamped by ResourceGrid via history.replaceState). Lets a Back-navigation
 * server-render everything they had on screen so the browser can restore
 * their scroll position. Clamped so a crafted URL can't demand the whole
 * catalog in one query; 1 when absent or nonsense.
 */
export function loadedPages(
  searchParams: { [key: string]: string | string[] | undefined },
): number {
  const raw = typeof searchParams.loaded === 'string' ? parseInt(searchParams.loaded, 10) : NaN;
  return Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 30) : 1;
}
