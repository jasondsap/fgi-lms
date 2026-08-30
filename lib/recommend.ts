// =============================================================================
// Library assistant — catalog for the recommender
// =============================================================================
//
// The whole published catalog is small enough (~142 rows, ~17.5k tokens) to put
// in the prompt on every request, so there is no retrieval/embedding layer:
// Claude sees every resource it is allowed to recommend and picks from it. That
// removes a whole class of "the right answer existed but retrieval missed it"
// failures, and it means the model can only ever name a slug we handed it.
//
// The catalog is surface-scoped through the same `resource_visibility`
// allow-list the library uses, so a Colorado visitor is never recommended
// something that isn't on the Colorado portal.
import { sql } from '@/lib/db';

export interface CatalogEntry {
  slug: string;
  title: string;
  type: string;
  duration_minutes: number | null;
  is_naadac_ce: boolean;
}

export interface Catalog {
  /** One line per resource, fed to the model. */
  text: string;
  /** Slug -> entry, used to validate what the model returns. */
  bySlug: Map<string, CatalogEntry>;
}

/**
 * Build the catalog for one surface ('fgi' | 'colorado' | 'scarr').
 *
 * Resources with no description are skipped — the description is the entire
 * matching signal (audience/topic tags are populated on only a handful of
 * rows), so an entry without one is noise the model can't reason about.
 */
export async function getCatalog(surface: string): Promise<Catalog> {
  const rows = (await sql`
    SELECT r.slug, r.title, r.type::text AS type, r.description,
           r.duration_minutes, r.is_naadac_ce
    FROM resources r
    WHERE r.published = TRUE AND r.internal = FALSE
      AND btrim(coalesce(r.description, '')) <> ''
      AND EXISTS (
        SELECT 1 FROM resource_visibility rv
        JOIN tenants t ON t.id = rv.tenant_id
        WHERE rv.resource_id = r.id AND t.slug = ${surface}
      )
    ORDER BY r.type, r.title
  `) as unknown as Array<CatalogEntry & { description: string }>;

  const bySlug = new Map<string, CatalogEntry>();
  const lines: string[] = [];

  for (const r of rows) {
    bySlug.set(r.slug, {
      slug: r.slug,
      title: r.title,
      type: r.type,
      duration_minutes: r.duration_minutes,
      is_naadac_ce: r.is_naadac_ce,
    });
    const bits = [
      r.slug,
      r.type + (r.is_naadac_ce ? ' (NAADAC CE)' : ''),
      r.duration_minutes ? `${r.duration_minutes} min` : '',
      `${r.title} — ${r.description.replace(/\s+/g, ' ').trim()}`,
    ].filter(Boolean);
    lines.push(bits.join(' | '));
  }

  return { text: lines.join('\n'), bySlug };
}

/** Human-facing label per resource type, mirroring the library's own wording. */
export const SURFACE_LABEL: Record<string, string> = {
  fgi: 'the Fletcher Group Learning Resource Center',
  colorado: 'the Colorado recovery housing learning portal',
  scarr: 'the SCARR (South Carolina Alliance for Recovery Residences) learning portal',
};
