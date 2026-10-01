// =============================================================================
// Monthly report as flat tables (10-1-26) — one sheet per section for Excel,
// the same sections stacked for CSV. SERVER-ONLY (shares the exceljs writers
// in portal-admin-export).
// =============================================================================
import { RATING_ITEMS } from '@/lib/evaluation-items';
import type { MonthlyReport } from '@/lib/monthly-report';
import { tableToCsv, type Cell, type ReportTable } from '@/lib/portal-admin-export';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

const typeLabel = (t: string | null) => (t ? RESOURCE_TYPE_LABELS[t as ResourceType] ?? t : '');
const orBlank = (v: number | null): Cell => (v === null ? '' : v);

export function monthlyReportTables(r: MonthlyReport): ReportTable[] {
  const t = r.traffic && !('error' in r.traffic) ? r.traffic : null;
  const s = r.evaluations.summary;

  const summary: ReportTable = {
    sheet: 'Summary',
    header: ['Metric', 'Value', 'Notes'],
    rows: [
      ['Report month', r.month.label, 'UTC month boundaries'],
      ['Generated', new Date(r.generatedAt), ''],
      ['Site visitors (Vercel)', t ? t.visitors : '', t ? 'Browsers, not accounts' : 'Vercel analytics unavailable'],
      ['Site page views (Vercel)', t ? t.pageviews : '', ''],
      ['New learner registrations', r.registrations.total, `Staff/admin accounts excluded: ${r.registrations.excludedStaff}`],
      ['Active signed-in users', r.activity.activeUsers, 'Any logged activity in the month'],
      ['Resource views', r.activity.views, 'Signed-in page opens; history from Aug 29, 2026'],
      ['Downloads', r.activity.downloads, 'History from Sep 17, 2026'],
      ['Shares', r.activity.shares, 'History from Sep 17, 2026'],
      ['Podcast plays', r.activity.plays, 'History from Oct 1, 2026'],
      ['Completions', r.activity.completions, 'Courses and watched-through videos'],
      ['Evaluation responses', s.responses, `${s.users} people, ${s.items} items`],
      ...RATING_ITEMS.map((i) => [`Avg: ${i.prompt}`, orBlank(s[i.key]), '0-10 scale'] as Cell[]),
      ['Evaluations: may contact', s.may_contact, ''],
      ['Evaluations: with written comments', s.with_text, ''],
    ],
  };

  const registrations: ReportTable = {
    sheet: 'Registrations',
    header: ['Registered from', 'New learners'],
    rows: r.registrations.bySurface.map((x) => [x.label, x.count]),
  };

  const roles: ReportTable = {
    sheet: 'I am a',
    header: ['I am a…', 'New learners who picked it'],
    rows: [
      ...r.registrations.byRole.map((x) => [x.label, x.users] as Cell[]),
      ['(picked more than one)', r.registrations.multiRole],
    ],
  };

  const other: ReportTable = {
    sheet: 'Other (free text)',
    header: ['"Other" answer'],
    rows: r.registrations.otherTexts.map((x) => [x]),
  };

  const podcast: ReportTable = {
    sheet: 'Podcast',
    header: ['Item', 'Unique listeners (pressed play)', 'Plays', 'Unique viewers (opened page)', 'Page opens'],
    rows: r.podcast.map((p) => [p.title, p.players, p.plays, p.openers, p.opens]),
  };

  const evalItems: ReportTable = {
    sheet: 'Evaluations by item',
    header: ['Item', 'ID', 'Type', 'Responses', ...RATING_ITEMS.map((i) => `${i.prompt} (avg 0-10)`)],
    rows: r.evaluations.byItem.map((e) => [
      e.title, e.course_code ?? '', typeLabel(e.type), e.responses,
      ...RATING_ITEMS.map((i) => e[i.key]),
    ]),
  };

  const comments: ReportTable = {
    sheet: 'Evaluation comments',
    header: ['Submitted', 'Item', 'What did you LIKE?', 'What did you NOT LIKE?', 'Other topics or suggestions'],
    rows: r.evaluations.comments.map((c) => [
      new Date(c.created_at), c.title, c.liked ?? '', c.disliked ?? '', c.future_topics ?? '',
    ]),
  };

  const top: ReportTable = {
    sheet: 'Top resources',
    header: ['Item', 'ID', 'Type', 'Unique viewers', 'Views', 'Downloads', 'Shares', 'Completions'],
    rows: r.activity.topResources.map((x) => [
      x.title, x.course_code ?? '', typeLabel(x.type), x.viewers, x.views, x.downloads, x.shares, x.completions,
    ]),
  };

  const tables = [summary, registrations, roles, other, podcast, evalItems, comments, top];
  if (t) {
    const dim = (sheet: string, label: string, rows: typeof t.devices): ReportTable => ({
      sheet, header: [label, 'Page views', 'Visitors'], rows: rows.map((d) => [d.key, d.pageviews, d.visitors]),
    });
    tables.push(dim('Devices', 'Device', t.devices), dim('Top pages', 'Path', t.topPages), dim('Countries', 'Country', t.countries));
  }
  return tables;
}

/** All sections in one CSV, each under its sheet name, blank line between. */
export function monthlyReportCsv(tables: ReportTable[]): string {
  return tables.map((t) => `${t.sheet}\r\n${tableToCsv(t)}`).join('\r\n');
}
