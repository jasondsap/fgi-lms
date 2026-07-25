/**
 * Flatten Next.js `searchParams` into a query string, dropping `page`.
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
    if (k === 'page' || v === undefined) continue;
    if (Array.isArray(v)) v.forEach((val) => qs.append(k, val));
    else qs.append(k, v);
  }
  for (const [k, v] of Object.entries(extra ?? {})) {
    if (v !== undefined && !qs.has(k)) qs.set(k, v);
  }
  return qs.toString();
}
