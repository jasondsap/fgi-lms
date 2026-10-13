// =============================================================================
// Weekly "what was added" email for FGI staff (Jennifer, burn-down 9-28 row
// 23: "staff notifications of new items — maybe weekly email if anything was
// added"). SERVER-ONLY. Run by /api/cron/weekly-additions every Monday; sends
// nothing when the week was quiet. Recipients are every account whose role is
// admin or staff (the LRC's own definition of "staff"), never learners.
// =============================================================================
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/notify';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fgilearn.org';

interface AddedRow {
  course_code: string | null;
  title: string;
  slug: string;
  type: ResourceType;
  internal: boolean;
  created_at: string;
  /** Tenant slugs the row is visible on (allow-list), 'fgi' included. */
  portals: string[] | null;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Resources published in the last `days` days, newest first. */
export async function listRecentAdditions(days = 7): Promise<AddedRow[]> {
  const rows = await sql`
    SELECT r.course_code, r.title, r.slug, r.type::text AS type, r.internal, r.created_at,
           (SELECT array_agg(t.slug ORDER BY t.slug) FROM resource_visibility rv
              JOIN tenants t ON t.id = rv.tenant_id WHERE rv.resource_id = r.id) AS portals
    FROM resources r
    WHERE r.published = TRUE AND r.created_at >= now() - make_interval(days => ${days})
    ORDER BY r.created_at DESC, r.title`;
  return rows as AddedRow[];
}

/** Admin + staff accounts — the people who should hear about new content. */
export async function listStaffRecipients(): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT lower(email) AS email FROM users
    WHERE role IN ('admin', 'staff') AND email IS NOT NULL AND email <> ''
    ORDER BY 1`;
  return rows.map((r) => r.email as string);
}

function linkFor(r: AddedRow): string {
  const portals = r.portals ?? [];
  const base = portals.includes('fgi') || portals.length === 0 ? '' : `/${portals[0]}`;
  return `${BASE_URL}${base}/resource/${r.slug}`;
}

const PORTAL_NAMES: Record<string, string> = { fgi: 'Fletcher Group', colorado: 'Colorado', scarr: 'SCARR' };

export function weeklyDigestEmail(rows: AddedRow[], days: number): { subject: string; html: string } {
  const p = 'margin: 0 0 12px; font-size: 14px;';
  const items = rows.map((r) => {
    const type = RESOURCE_TYPE_LABELS[r.type] ?? r.type;
    const where = (r.portals ?? []).map((s) => PORTAL_NAMES[s] ?? s).join(', ') || 'not yet visible on any portal';
    const flags = r.internal ? ' <span style="color:#a20e3e;font-weight:700;">INTERNAL</span>' : '';
    return `<li style="margin: 0 0 10px;">
      <a href="${linkFor(r)}" style="color: #0e72a2; font-weight: 600;">${esc(r.title)}</a>${flags}<br>
      <span style="color: #5f6e7c; font-size: 13px;">${esc(type)} &middot; ID ${esc(r.course_code ?? '—')} &middot; ${esc(where)}</span>
    </li>`;
  }).join('');
  const n = rows.length;
  return {
    subject: `LRC: ${n} new item${n === 1 ? '' : 's'} added this week`,
    html: `
    <div style="font-family: 'Open Sans', Arial, sans-serif; color: #1d2b38; line-height: 1.6; max-width: 560px;">
      <h2 style="margin: 0 0 10px; font-size: 19px; color: #163d5b;">New in the Learning Resource Center</h2>
      <p style="${p}">${n} item${n === 1 ? ' was' : 's were'} added in the last ${days} days:</p>
      <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 14px;">${items}</ul>
      <p style="${p}">Full inventory with filters, tags and portals: <a href="${BASE_URL}/admin/catalog" style="color: #0e72a2;">${BASE_URL}/admin/catalog</a></p>
      <p style="margin: 16px 0 0; font-size: 12px; color: #5f6e7c;">
        Weekly staff notice from the Fletcher Group Learning Resource Center. Sent to admin and staff accounts only.
      </p>
    </div>`,
  };
}

/** The cron body: look back a week, email staff if anything landed. */
export async function sendWeeklyDigest(days = 7): Promise<{ items: number; recipients: number; sent: boolean }> {
  const [rows, to] = await Promise.all([listRecentAdditions(days), listStaffRecipients()]);
  if (rows.length === 0 || to.length === 0) return { items: rows.length, recipients: to.length, sent: false };
  const sent = await sendEmail({ to, ...weeklyDigestEmail(rows, days) });
  return { items: rows.length, recipients: to.length, sent };
}
