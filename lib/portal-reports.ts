// =============================================================================
// Portal Admin saved + scheduled reports (phase 3, 9-19-26). SERVER-ONLY.
//
// A saved report is a named filter set on one portal's admin page
// (portal_saved_reports). Give it a frequency and the same row is a scheduled
// email. Rules that keep this safe:
//   - A report belongs to the person who saved it. Every read/write here takes
//     the owner id from the session and puts it in the WHERE clause.
//   - A scheduled email goes to its OWNER's account email and nowhere else —
//     there is no free-text recipient, so a report can't be pointed at an
//     outside address.
//   - At send time the owner must STILL be allowed to administer that portal
//     (role may have been changed since); otherwise the schedule is switched
//     off instead of sent.
//   - `query` is only ever re-parsed through parseFilters; the portal scope
//     comes from the row's `portal` column, which was written after
//     canAdminPortal() passed.
// =============================================================================
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/notify';
import {
  DATE_FIELDS, filterQuery, listPortalEvaluations, listPortalProgress, listPortalUsers,
  parseFilters, type PortalFilters,
} from '@/lib/portal-admin';
import {
  evaluationsTable, progressTable, tableToCsv, tableToXlsx, usersTable, type ReportTable,
} from '@/lib/portal-admin-export';
import { getTenantConfig } from '@/lib/tenants';
import { USER_ROLE_LABELS, type UserRole } from '@/types';

export const REPORT_KINDS = [
  { value: 'users', label: 'Users' },
  { value: 'progress', label: 'Progress' },
  { value: 'evaluations', label: 'Evaluations' },
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number]['value'];
export const isReportKind = (v: unknown): v is ReportKind => REPORT_KINDS.some((k) => k.value === v);

export const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly — Mondays' },
  { value: 'monthly', label: 'Monthly — the 1st' },
] as const;
export type Frequency = (typeof FREQUENCIES)[number]['value'];
export const isFrequency = (v: unknown): v is Frequency => FREQUENCIES.some((f) => f.value === v);

export const FORMATS = ['xlsx', 'csv'] as const;
export type ReportFormat = (typeof FORMATS)[number];

/** Per owner per portal — plenty for a person, small enough that the daily job stays trivial. */
export const MAX_SAVED_REPORTS = 25;

export interface SavedReport {
  id: string;
  portal: string;
  owner_id: string;
  name: string;
  report: ReportKind;
  query: string;
  frequency: Frequency | null;
  format: ReportFormat;
  period_only: boolean;
  next_run_at: string | null;
  last_sent_at: string | null;
  created_at: string;
}

export function savedFilters(r: Pick<SavedReport, 'query'>): PortalFilters {
  const params: Record<string, string[]> = {};
  new URLSearchParams(r.query).forEach((v, k) => { (params[k] ??= []).push(v); });
  return parseFilters(params);
}

export async function listSavedReports(portal: string, ownerId: string): Promise<SavedReport[]> {
  return (await sql`
    SELECT * FROM portal_saved_reports
    WHERE portal = ${portal} AND owner_id = ${ownerId}
    ORDER BY created_at
  `) as SavedReport[];
}

export async function getSavedReport(id: string, portal: string, ownerId: string): Promise<SavedReport | null> {
  const rows = await sql`
    SELECT * FROM portal_saved_reports
    WHERE id = ${id} AND portal = ${portal} AND owner_id = ${ownerId}
  `;
  return (rows[0] as SavedReport) ?? null;
}

/** Returns false when the owner is at the cap. The filters are stored canonicalised. */
export async function createSavedReport(input: {
  portal: string; ownerId: string; name: string; report: ReportKind; filters: PortalFilters;
}): Promise<boolean> {
  const [{ n }] = await sql`
    SELECT COUNT(*)::int AS n FROM portal_saved_reports
    WHERE portal = ${input.portal} AND owner_id = ${input.ownerId}
  `;
  if ((n as number) >= MAX_SAVED_REPORTS) return false;
  await sql`
    INSERT INTO portal_saved_reports (portal, owner_id, name, report, query)
    VALUES (${input.portal}, ${input.ownerId}, ${input.name}, ${input.report}, ${filterQuery(input.filters)})
  `;
  return true;
}

export async function deleteSavedReport(id: string, portal: string, ownerId: string): Promise<void> {
  await sql`
    DELETE FROM portal_saved_reports
    WHERE id = ${id} AND portal = ${portal} AND owner_id = ${ownerId}
  `;
}

export async function setSchedule(input: {
  id: string; portal: string; ownerId: string;
  frequency: Frequency | null; format: ReportFormat; periodOnly: boolean;
}): Promise<void> {
  const next = input.frequency ? nextRun(input.frequency, new Date()) : null;
  await sql`
    UPDATE portal_saved_reports SET
      frequency = ${input.frequency}, format = ${input.format},
      period_only = ${input.periodOnly}, next_run_at = ${next}
    WHERE id = ${input.id} AND portal = ${input.portal} AND owner_id = ${input.ownerId}
  `;
}

// -----------------------------------------------------------------------------
// Schedule arithmetic (UTC throughout — the cron fires at 12:00 UTC, morning
// across the US).
// -----------------------------------------------------------------------------

const RUN_HOUR_UTC = 12;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** First scheduled slot strictly after `after`: next Monday, or the 1st of next month. */
export function nextRun(frequency: Frequency, after: Date): Date {
  const d = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate(), RUN_HOUR_UTC));
  if (frequency === 'monthly') {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, RUN_HOUR_UTC));
  }
  do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() !== 1);
  return d;
}

/** The period a scheduled send covers: the last 7 full days, or the previous calendar month. */
export function reportPeriod(frequency: Frequency, runAt: Date): { from: string; to: string } {
  const day = (offset: number) =>
    new Date(Date.UTC(runAt.getUTCFullYear(), runAt.getUTCMonth(), runAt.getUTCDate() + offset));
  if (frequency === 'weekly') return { from: iso(day(-7)), to: iso(day(-1)) };
  const firstOfThis = new Date(Date.UTC(runAt.getUTCFullYear(), runAt.getUTCMonth(), 1));
  const firstOfPrev = new Date(Date.UTC(runAt.getUTCFullYear(), runAt.getUTCMonth() - 1, 1));
  return { from: iso(firstOfPrev), to: iso(new Date(firstOfThis.getTime() - 86400000)) };
}

/** Filters a send actually runs with — the saved ones, windowed when the schedule says so. */
export function filtersForSend(r: SavedReport, runAt: Date): PortalFilters {
  const f = savedFilters(r);
  if (!r.period_only || !r.frequency) return f;
  return { ...f, ...reportPeriod(r.frequency, runAt) };
}

// -----------------------------------------------------------------------------
// Building and sending
// -----------------------------------------------------------------------------

export async function buildReportTable(
  portal: string, portalName: string, report: ReportKind, filters: PortalFilters, onlyUserId?: string,
): Promise<ReportTable> {
  if (report === 'evaluations') {
    return evaluationsTable(await listPortalEvaluations(portal, filters, 20000, onlyUserId), portalName);
  }
  if (report === 'progress') {
    return progressTable(await listPortalProgress(portal, filters, 20000, onlyUserId), portalName);
  }
  return usersTable(await listPortalUsers(portal, filters, 5000, onlyUserId));
}

/** Plain-language filter summary for the saved-reports list and the email body. */
export function describeFilters(f: PortalFilters, report: ReportKind): string[] {
  const out: string[] = [];
  if (f.q) out.push(`User contains “${f.q}”`);
  if (f.org) out.push(`Organization contains “${f.org}”`);
  if (f.county) out.push(`County contains “${f.county}”`);
  if (f.zips.length) out.push(`Zip ${f.zips.join(', ')}`);
  if (f.roles.length) out.push(`I am a: ${f.roles.map((r) => USER_ROLE_LABELS[r as UserRole] ?? r).join(' or ')}`);
  if (f.items.length) out.push(`${f.items.length} selected item${f.items.length === 1 ? '' : 's'}`);
  if (f.status && report !== 'evaluations') out.push(f.status === 'completed' ? 'Completed' : 'In progress');
  if (f.from || f.to) {
    const field = report === 'evaluations' && f.dateField !== 'created'
      ? 'Evaluation submitted'
      : DATE_FIELDS.find((d) => d.value === f.dateField)?.label ?? 'Date';
    out.push(`${field}: ${f.from ?? 'any'} to ${f.to ?? 'any'}`);
  } else if (f.dateField !== 'accessed') {
    // No dates, but a non-default date setting was saved: that is what a
    // "past week / month" schedule will window on.
    out.push(`Period applies to: ${DATE_FIELDS.find((d) => d.value === f.dateField)?.label}`);
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fgilearn.org';

export type SendResult = 'sent' | 'not-allowed' | 'no-portal' | 'email-failed';

/**
 * Build one saved report and email it to its owner. Re-checks, from the
 * database, that the owner may still administer the portal — this runs from
 * the cron with no session, so nothing else stands between a demoted account
 * and another week of other people's data.
 */
export async function sendSavedReport(r: SavedReport, runAt: Date): Promise<SendResult> {
  const tenant = getTenantConfig(r.portal);
  if (!tenant) return 'no-portal';

  const [owner] = await sql`
    SELECT u.email, u.given_name, u.role, t.slug AS tenant_slug
    FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
    WHERE u.id = ${r.owner_id}
  `;
  const allowed = owner
    && (owner.role === 'admin' || (owner.role === 'tenant_admin' && owner.tenant_slug === r.portal));
  if (!allowed) return 'not-allowed';

  const filters = filtersForSend(r, runAt);
  const table = await buildReportTable(r.portal, tenant.name, r.report, filters);
  const filename = `${r.portal}-${r.report}-${iso(runAt)}.${r.format}`;
  const content = r.format === 'csv'
    ? Buffer.from(tableToCsv(table), 'utf8')
    : await tableToXlsx(table, `${tenant.name} — ${r.name}`);

  const kind = REPORT_KINDS.find((k) => k.value === r.report)?.label ?? r.report;
  const summary = describeFilters(filters, r.report);
  const pageUrl = `${BASE_URL}/${r.portal}/admin?${filterQuery(savedFilters(r), { tab: r.report })}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:560px">
      <p>Hi ${esc((owner.given_name as string) || 'there')},</p>
      <p>Your saved report <strong>${esc(r.name)}</strong> for ${esc(tenant.name)} is attached
         (${kind}, ${table.rows.length} row${table.rows.length === 1 ? '' : 's'}).</p>
      ${summary.length
        ? `<p style="margin-bottom:4px">Filters:</p><ul style="margin-top:0">${summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
        : '<p>No filters — everyone on the portal.</p>'}
      <p><a href="${esc(pageUrl)}">Open this report in the Learning Center</a> ·
         change or stop it under Portal Admin → Saved reports.</p>
      <p style="font-size:12.5px;color:#666">This file contains personal information about learners on your
         portal. Please store and share it accordingly.</p>
    </div>`;

  const ok = await sendEmail({
    to: [owner.email as string],
    subject: `${tenant.name}: ${r.name} (${iso(runAt)})`,
    html,
    attachments: [{ filename, content: content.toString('base64') }],
  });
  return ok ? 'sent' : 'email-failed';
}

/**
 * The daily job. Due schedules are sent once and moved to their next slot; a
 * schedule whose owner lost access is switched off. An email failure leaves
 * next_run_at alone, so tomorrow's run retries it.
 */
export async function runDueReports(now: Date, limit = 50): Promise<Record<SendResult, number>> {
  const due = (await sql`
    SELECT * FROM portal_saved_reports
    WHERE frequency IS NOT NULL AND next_run_at <= ${now}
    ORDER BY next_run_at
    LIMIT ${limit}
  `) as SavedReport[];

  const tally: Record<SendResult, number> = { sent: 0, 'not-allowed': 0, 'no-portal': 0, 'email-failed': 0 };
  for (const r of due) {
    let result: SendResult;
    try {
      result = await sendSavedReport(r, now);
    } catch (err) {
      console.error('[portal-reports] build failed', r.id, err);
      result = 'email-failed';
    }
    tally[result] += 1;
    if (result === 'sent') {
      await sql`
        UPDATE portal_saved_reports
        SET last_sent_at = ${now}, next_run_at = ${nextRun(r.frequency as Frequency, now)}
        WHERE id = ${r.id}
      `;
    } else if (result !== 'email-failed') {
      await sql`UPDATE portal_saved_reports SET frequency = NULL, next_run_at = NULL WHERE id = ${r.id}`;
    }
  }
  return tally;
}
