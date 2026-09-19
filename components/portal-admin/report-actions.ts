'use server';
// =============================================================================
// Server actions for Portal Admin saved reports (phase 3, 9-19-26). The
// reporting pages stay read-only about PORTAL data — these only touch the
// signed-in person's own saved reports. Module-level (never inline closures —
// see components/layout/auth-actions.ts). The portal arrives in the form, so
// every action re-checks canAdminPortal for it, and ownership is enforced in
// lib/portal-reports.ts by the session's user id.
// =============================================================================
import { redirect } from 'next/navigation';
import { parseFilters } from '@/lib/portal-admin';
import {
  FORMATS, createSavedReport, deleteSavedReport, getSavedReport, isFrequency, isReportKind,
  sendSavedReport, setSchedule, type ReportFormat,
} from '@/lib/portal-reports';
import { getTenantConfig } from '@/lib/tenants';
import { canAdminPortal, getViewer } from '@/lib/viewer';

const UUID = /^[0-9a-f-]{36}$/i;
const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/** Who is asking, for which portal — or null when they may not administer it. */
async function authorize(form: FormData): Promise<{ portal: string; userId: string } | null> {
  const tenant = getTenantConfig(text(form, 'portal'));
  const viewer = await getViewer();
  if (!tenant || !viewer.userId || !canAdminPortal(viewer, tenant.slug)) return null;
  return { portal: tenant.slug, userId: viewer.userId };
}

/** Every action ends on the Saved reports tab with a one-line note. */
function back(portal: string, note: string): never {
  redirect(`/${portal}/admin?tab=saved&note=${encodeURIComponent(note)}`);
}

export async function saveReportAction(form: FormData): Promise<void> {
  const who = await authorize(form);
  if (!who) redirect('/');
  const name = text(form, 'name').slice(0, 80);
  const report = text(form, 'report');
  if (!name) back(who.portal, 'Give the report a name to save it.');
  if (!isReportKind(report)) back(who.portal, 'Unknown report.');

  const params: Record<string, string[]> = {};
  new URLSearchParams(text(form, 'query')).forEach((v, k) => { (params[k] ??= []).push(v); });
  const saved = await createSavedReport({
    portal: who.portal, ownerId: who.userId, name, report, filters: parseFilters(params),
  });
  back(who.portal, saved ? `Saved “${name}”.` : 'You have reached the limit of saved reports — delete one first.');
}

export async function updateScheduleAction(form: FormData): Promise<void> {
  const who = await authorize(form);
  if (!who) redirect('/');
  const id = text(form, 'id');
  if (!UUID.test(id)) back(who.portal, 'Unknown report.');
  const frequency = text(form, 'frequency');
  const format = text(form, 'format');
  await setSchedule({
    id, portal: who.portal, ownerId: who.userId,
    frequency: isFrequency(frequency) ? frequency : null,
    format: (FORMATS as readonly string[]).includes(format) ? (format as ReportFormat) : 'xlsx',
    periodOnly: form.get('period_only') === 'on',
  });
  back(who.portal, isFrequency(frequency) ? 'Schedule saved — it will be emailed to you.' : 'Schedule turned off.');
}

export async function deleteReportAction(form: FormData): Promise<void> {
  const who = await authorize(form);
  if (!who) redirect('/');
  const id = text(form, 'id');
  if (UUID.test(id)) await deleteSavedReport(id, who.portal, who.userId);
  back(who.portal, 'Report deleted.');
}

/** "Email it to me now" — the same build + send the daily job does, on demand. */
export async function sendReportNowAction(form: FormData): Promise<void> {
  const who = await authorize(form);
  if (!who) redirect('/');
  const id = text(form, 'id');
  const report = UUID.test(id) ? await getSavedReport(id, who.portal, who.userId) : null;
  if (!report) back(who.portal, 'Unknown report.');
  const result = await sendSavedReport(report, new Date());
  back(who.portal, result === 'sent'
    ? 'Sent — check your inbox.'
    : 'The email could not be sent. Try again, or use Export on the report itself.');
}
