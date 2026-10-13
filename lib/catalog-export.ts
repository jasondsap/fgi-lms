// =============================================================================
// Catalog export (Jennifer, 10-12-26): every item in the Learning Resource
// Center as one flat sheet — ID, type, every filter checkbox it answers to on
// each surface, its tags, and which portals it is visible on. SERVER-ONLY.
//
// Reads resources + resource_visibility directly. s3_key is never selected
// (only whether one exists), so the S3 invariant in lib/resources.ts holds.
// Filter membership is derived the same way the library derives it:
//   - "Courses"            → naadac_ce = is_naadac_ce flag, course = type
//   - "Resource Type"      → the stored type, labelled as the filter bar does
//   - "Documents" (portal) → DOCUMENT_TYPES umbrella
//   - "Certification Info" → the tenant's curated collections (lib/tenants.ts)
//   - "I Am A…" / "Learn About…" → audience_tags / topic_tags, labelled
// =============================================================================
import { sql } from '@/lib/db';
import type { ReportTable } from '@/lib/portal-admin-export';
import { getTenantConfig, TENANT_SLUGS } from '@/lib/tenants';
import {
  AUDIENCE_TAG_LABELS, DOCUMENT_TYPES, DURATION_LABELS, FILTER_GROUPS,
  RESOURCE_TYPE_LABELS, TOPIC_TAG_LABELS,
  type AudienceTag, type ResourceType, type TopicTag,
} from '@/types';

interface CatalogRow {
  id: string;
  course_code: string | null;
  title: string;
  slug: string;
  type: ResourceType;
  published: boolean;
  internal: boolean;
  is_naadac_ce: boolean;
  ceu_credits: number | string | null;
  naadac_skill_groups: string[] | null;
  duration_minutes: number | null;
  audience_tags: string[] | null;
  topic_tags: string[] | null;
  search_keywords: string[] | null;
  moodle_course_id: number | null;
  vimeo_id: string | null;
  external_url: string | null;
  has_file: boolean;
  event_date: string | null;
  published_at: string | null;
  updated_at: string | null;
  /** From resource_visibility: one entry per surface, with its staff-only flag. */
  portals: Array<{ slug: string; internal: boolean }> | null;
}

export interface CatalogSurface { slug: string; name: string }

/**
 * Surfaces in display order: FGI first, then the tenant portals, named as the
 * `tenants` table names them ("Colorado Recovery Housing", "SCARR") — the
 * short names Jennifer uses, not the long portal titles in lib/tenants.ts.
 */
export async function getCatalogSurfaces(): Promise<CatalogSurface[]> {
  const rows = (await sql`SELECT slug, name FROM tenants ORDER BY slug`) as CatalogSurface[];
  const byName = new Map(rows.map((r) => [r.slug, r.name]));
  const portals = [...new Set([...TENANT_SLUGS, ...rows.map((r) => r.slug).filter((s) => s !== 'fgi')])];
  return [
    { slug: 'fgi', name: 'Fletcher Group' },
    ...portals.map((slug) => ({ slug, name: byName.get(slug) ?? getTenantConfig(slug)?.name ?? slug })),
  ];
}

const join = (xs: string[]) => xs.join('; ');
const yesNo = (v: boolean) => (v ? 'Yes' : 'No');
const date = (v: string | null): Date | null => (v ? new Date(v) : null);

const audienceLabel = (t: string) => AUDIENCE_TAG_LABELS[t as AudienceTag] ?? t;
const topicLabel = (t: string) => TOPIC_TAG_LABELS[t as TopicTag] ?? t;

/** The "Resource Type" filter-bar label (reads "External Resources" for non_fgi). */
function resourceTypeFilterLabel(type: ResourceType): string {
  const group = FILTER_GROUPS.find((g) => g.title === 'Resource Type');
  return group?.labels?.[type] ?? RESOURCE_TYPE_LABELS[type] ?? type;
}

function durationBand(mins: number | null): string {
  if (mins === null || mins === undefined) return '';
  if (mins <= 15) return DURATION_LABELS.under_15;
  if (mins <= 30) return DURATION_LABELS['16_30'];
  if (mins <= 60) return DURATION_LABELS['31_60'];
  if (mins <= 90) return DURATION_LABELS['61_90'];
  if (mins <= 120) return DURATION_LABELS['91_120'];
  return DURATION_LABELS['121_plus'];
}

/** slug → ["Colorado Recovery Housing: Videos", "SCARR: Videos", …] */
function collectionIndex(): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const slug of TENANT_SLUGS) {
    const cfg = getTenantConfig(slug);
    const collections = cfg?.v3?.collections ?? {};
    for (const { label, slugs } of Object.values(collections)) {
      for (const s of slugs) idx.set(s, [...(idx.get(s) ?? []), `${cfg?.name ?? slug}: ${label}`]);
    }
  }
  return idx;
}

export async function getCatalogRows(): Promise<CatalogRow[]> {
  const rows = await sql`
    SELECT r.id, r.course_code, r.title, r.slug, r.type::text AS type, r.published, r.internal,
           r.is_naadac_ce, r.ceu_credits, r.naadac_skill_groups, r.duration_minutes,
           r.audience_tags, r.topic_tags, r.search_keywords, r.moodle_course_id,
           r.vimeo_id, r.external_url, (r.s3_key IS NOT NULL) AS has_file,
           r.event_date, r.published_at, r.updated_at,
           (SELECT json_agg(json_build_object('slug', t.slug, 'internal', rv.internal) ORDER BY t.slug)
              FROM resource_visibility rv JOIN tenants t ON t.id = rv.tenant_id
             WHERE rv.resource_id = r.id) AS portals
    FROM resources r
    ORDER BY r.type, r.title`;
  return rows as CatalogRow[];
}

export function catalogTable(rows: CatalogRow[], surfaces: CatalogSurface[]): ReportTable {
  const collections = collectionIndex();

  const header = [
    'ID', 'Title', 'Type', 'Published', 'Staff only (all portals)',
    'Portals',
    ...surfaces.map((s) => s.name),
    'Filter: Courses', 'Filter: Resource Type', 'Filter: Documents (portal)',
    'Filter: Certification Info (portal)', 'Filter: Duration',
    'I Am A…', 'I Want To Learn About…',
    'Audience tags (keys)', 'Topic tags (keys)', 'Search keywords',
    'NAADAC CE', 'CE hours', 'NAADAC skill groups', 'Duration (mins)',
    'Moodle course ID', 'Vimeo ID', 'External URL', 'PDF / file',
    'Event date', 'Published date', 'Last updated', 'Slug', 'Database ID',
  ];

  const data = rows.map((r) => {
    const portals = r.portals ?? [];
    const on = (slug: string) => portals.find((p) => p.slug === slug);
    const portalNames = surfaces
      .filter((s) => on(s.slug))
      .map((s) => `${s.name}${on(s.slug)?.internal ? ' (staff only)' : ''}`);
    const courses = [
      r.is_naadac_ce ? RESOURCE_TYPE_LABELS.naadac_ce : '',
      r.type === 'course' ? RESOURCE_TYPE_LABELS.course : '',
    ].filter(Boolean);
    const audience = r.audience_tags ?? [];
    const topics = r.topic_tags ?? [];
    return [
      r.course_code ?? '', r.title, RESOURCE_TYPE_LABELS[r.type] ?? r.type,
      yesNo(r.published), yesNo(r.internal),
      portalNames.length ? join(portalNames) : 'None (not visible anywhere)',
      ...surfaces.map((s) => (on(s.slug) ? (on(s.slug)?.internal ? 'Staff only' : 'Yes') : '')),
      join(courses), resourceTypeFilterLabel(r.type),
      yesNo(DOCUMENT_TYPES.includes(r.type)),
      join(collections.get(r.slug) ?? []), durationBand(r.duration_minutes),
      join(audience.map(audienceLabel)), join(topics.map(topicLabel)),
      join(audience), join(topics), join(r.search_keywords ?? []),
      yesNo(r.is_naadac_ce),
      r.ceu_credits !== null && r.ceu_credits !== undefined ? Number(r.ceu_credits) : null,
      join(r.naadac_skill_groups ?? []), r.duration_minutes,
      r.moodle_course_id, r.vimeo_id ?? '', r.external_url ?? '', yesNo(r.has_file),
      date(r.event_date), date(r.published_at), date(r.updated_at), r.slug, r.id,
    ];
  });

  return { sheet: 'Catalog', header, rows: data };
}

/** Second sheet: every filter checkbox on every surface and the key it maps to. */
export function filterKeyTable(): ReportTable {
  const rows: ReportTable['rows'] = [];
  const documentTypes = DOCUMENT_TYPES.map((t) => RESOURCE_TYPE_LABELS[t]).join(', ');

  for (const g of FILTER_GROUPS) {
    for (const item of g.items) {
      if (typeof item === 'string') {
        const label = g.labels?.[item] ?? (
          g.param === 'type' ? RESOURCE_TYPE_LABELS[item as ResourceType] ?? item
          : g.param === 'audience' ? audienceLabel(item) : topicLabel(item));
        const portalLabel = g.tenantLabels?.[item];
        const shownOn = g.hidden?.includes(item) ? 'Hidden (no items yet)'
          : g.tenantOnly ? 'Portals only'
          : g.hideOnTenant || g.excludeOnTenant?.includes(item) ? 'Fletcher Group only' : 'All';
        rows.push([
          g.title,
          label + (portalLabel && portalLabel !== label ? ` (portals: ${portalLabel})` : ''),
          `${g.param} = ${item}`,
          shownOn,
          item === 'naadac_ce' ? 'Matches the "NAADAC CE" column, not a stored type' : '',
        ]);
      } else {
        rows.push([
          g.title, item.label, `${item.param} = ${item.value}`,
          item.tenantOnly || g.tenantOnly ? 'Portals only' : 'All',
          item.value === 'document' ? `Types: ${documentTypes}`
          : item.param === 'collection' ? 'Curated list per portal — see "Filter: Certification Info (portal)"' : '',
        ]);
      }
    }
  }
  return { sheet: 'Filter key', header: ['Filter group', 'Checkbox', 'Key', 'Shown on', 'Notes'], rows };
}

export async function getCatalogTables(): Promise<ReportTable[]> {
  const [rows, surfaces] = await Promise.all([getCatalogRows(), getCatalogSurfaces()]);
  return [catalogTable(rows, surfaces), filterKeyTable()];
}
