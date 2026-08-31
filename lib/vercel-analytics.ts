// =============================================================================
// Vercel Web Analytics API client (Jason, 8-31-26). SERVER-ONLY.
// =============================================================================
//
// Queries the public Web Analytics API (api.vercel.com/v1/query/web-analytics)
// so /admin/analytics can render Vercel's traffic data inside our own admin
// panel. Needs three env vars (in .env.local AND Vercel):
//   VERCEL_TOKEN       — access token (vercel.com → Account Settings → Tokens)
//   VERCEL_PROJECT_ID  — project settings → General → Project ID (prj_…)
//   VERCEL_TEAM_ID     — team settings → General → Team ID (team_…); omit for
//                        a personal-account project.
// Absent config → vercelAnalyticsEnabled is false and the page explains setup.
//
// Every fetch caches for 5 minutes (fetch revalidate) so a curious admin
// refreshing the page doesn't hammer the API.

export const vercelAnalyticsEnabled = Boolean(
  process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID,
);

export interface DayPoint {
  timestamp: string;
  pageviews: number;
  visitors: number;
}

export interface DimRow {
  key: string;
  pageviews: number;
  visitors: number;
}

async function query(
  endpoint: 'visits/aggregate' | 'visits/count',
  params: Record<string, string>,
): Promise<{ data: unknown }> {
  const url = new URL(`https://api.vercel.com/v1/query/web-analytics/${endpoint}`);
  url.searchParams.set('projectId', process.env.VERCEL_PROJECT_ID as string);
  if (process.env.VERCEL_TEAM_ID) url.searchParams.set('teamId', process.env.VERCEL_TEAM_ID);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Vercel analytics ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

/** Daily pageviews + visitors between two YYYY-MM-DD dates (inclusive). */
export async function getDailyTraffic(since: string, until: string): Promise<DayPoint[]> {
  const body = await query('visits/aggregate', { since, until, by: 'day' });
  return (body.data as DayPoint[]) ?? [];
}

/**
 * Top values for one dimension (requestPath, country, referrerHostname,
 * deviceType, browserName …). Vercel folds the tail into an "Others" row.
 */
export async function getTopBy(
  dimension: string,
  since: string,
  until: string,
  limit = 10,
): Promise<DimRow[]> {
  const body = await query('visits/aggregate', {
    since, until, by: dimension, limit: String(limit),
  });
  const rows = (body.data as Array<Record<string, unknown>>) ?? [];
  return rows.map((r) => ({
    key: String(r[dimension] ?? 'Unknown'),
    pageviews: Number(r.pageviews ?? 0),
    visitors: Number(r.visitors ?? 0),
  }));
}
