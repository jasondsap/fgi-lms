// =============================================================================
// Admin word search (Jennifer, burn-down 9-28 row 17: "search a word such as
// DEI on the back side and see everything that contains that word"). Plain
// case-insensitive substring match across every text an item carries —
// title, description, abstract, citation, search keywords, ID — no stemming
// or fuzziness, because an admin wants the literal hits. SERVER-ONLY.
// =============================================================================
import { sql } from '@/lib/db';
import type { ResourceType } from '@/types';

export interface CatalogHit {
  id: string;
  course_code: string | null;
  title: string;
  slug: string;
  type: ResourceType;
  published: boolean;
  internal: boolean;
  portals: string[] | null;
  /** Which fields contained the word, e.g. ['title', 'keywords']. */
  matched: string[];
  /** A short excerpt around the first description/abstract hit. */
  snippet: string | null;
}

const FIELDS: Array<[string, string]> = [
  ['title', 'r.title'],
  ['ID', 'r.course_code'],
  ['description', 'r.description'],
  ['abstract', 'r.abstract'],
  ['citation', 'r.citation'],
  ['keywords', "array_to_string(r.search_keywords, ' ')"],
];

export async function searchCatalog(q: string, limit = 500): Promise<CatalogHit[]> {
  const term = q.trim().slice(0, 100);
  if (!term) return [];
  // The term is bound once ($1); every fragment below is a constant from FIELDS.
  const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const matchedExpr = `ARRAY_REMOVE(ARRAY[${FIELDS.map(([name, col]) =>
    `CASE WHEN ${col} ILIKE $1 THEN '${name}' END`).join(', ')}], NULL)`;
  const rows = await sql(
    `SELECT r.id, r.course_code, r.title, r.slug, r.type::text AS type, r.published, r.internal,
            (SELECT array_agg(t.slug ORDER BY t.slug) FROM resource_visibility rv
               JOIN tenants t ON t.id = rv.tenant_id WHERE rv.resource_id = r.id) AS portals,
            ${matchedExpr} AS matched,
            COALESCE(r.description, r.abstract) AS body
     FROM resources r
     WHERE ${FIELDS.map(([, col]) => `${col} ILIKE $1`).join(' OR ')}
     ORDER BY (r.title ILIKE $1) DESC, r.title
     LIMIT $2`,
    [pattern, limit],
  );
  const lower = term.toLowerCase();
  return rows.map((r) => {
    const body: string = r.body ?? '';
    const at = body.toLowerCase().indexOf(lower);
    const snippet = at >= 0
      ? `${at > 60 ? '…' : ''}${body.slice(Math.max(0, at - 60), at + term.length + 80)}${at + term.length + 80 < body.length ? '…' : ''}`
      : null;
    return { ...(r as Omit<CatalogHit, 'snippet'>), snippet };
  });
}
