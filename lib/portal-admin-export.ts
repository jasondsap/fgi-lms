// =============================================================================
// Portal Admin exports (9-19-26): the two on-page reports as flat tables, and
// the CSV / Excel writers. SERVER-ONLY (exceljs). One table definition feeds
// both formats so the columns can't drift.
// =============================================================================
import ExcelJS from 'exceljs';
import { toCsv } from '@/lib/csv';
import { RATING_ITEMS, TEXT_ITEMS, CONTACT_ITEM } from '@/lib/evaluation-items';
import {
  roleLabels, statusLabel,
  type PortalEvaluationRow, type PortalProgressRow, type PortalUserRow,
} from '@/lib/portal-admin';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

export type Cell = string | number | Date | null;
export interface ReportTable { sheet: string; header: string[]; rows: Cell[][] }

// The Neon driver hands timestamps back as Date objects.
const date = (v: unknown): Date | null => (v ? new Date(v as string) : null);
const name = (u: { given_name: string | null; family_name: string | null }) =>
  [u.given_name, u.family_name].filter(Boolean).join(' ');
const typeLabel = (t: string | null) => (t ? RESOURCE_TYPE_LABELS[t as ResourceType] ?? t : '');
const yesNo = (v: boolean | null) => (v === null ? '' : v ? 'Yes' : 'No');

export function usersTable(users: PortalUserRow[]): ReportTable {
  return {
    sheet: 'Users',
    header: ['Name', 'Email', 'Organization', 'State', 'County', 'Zip', 'I am a…',
      'Account created', 'Registration completed', 'Last active',
      'Items accessed', 'In progress', 'Completed'],
    rows: users.map((u) => [
      name(u), u.email, u.organization ?? '', u.state ?? '', u.county ?? '', u.zip ?? '',
      roleLabels(u.roles, u.role_other),
      date(u.created_at), date(u.registration_completed_at), date(u.last_active),
      u.items, u.in_progress, u.completed,
    ]),
  };
}

export function progressTable(rows: PortalProgressRow[], portalName: string): ReportTable {
  return {
    sheet: 'Progress',
    header: ['Name', 'Email', 'Organization', 'County', 'Zip',
      'Item', 'ID', 'Type', 'Library', 'Status', 'Progress %',
      'First accessed', 'Last accessed', 'Completed',
      'Views', 'Shares', 'Downloads',
      'Quiz score', 'Quiz passed', 'Evaluation submitted', 'Certificate earned', 'CE hours'],
    rows: rows.map((r) => [
      name(r), r.email, r.organization ?? '', r.county ?? '', r.zip ?? '',
      r.title ?? '(item removed)', r.course_code ?? '', typeLabel(r.type),
      r.on_portal ? portalName : 'Fletcher Group Library',
      statusLabel(r), r.is_course ? Math.round(r.pct ?? 0) : null,
      date(r.first_at), date(r.last_at), date(r.completed_at),
      r.views, r.shares, r.downloads,
      r.quiz_best !== null && r.quiz_max ? `${Math.round(r.quiz_best)} / ${Math.round(r.quiz_max)}` : '',
      yesNo(r.quiz_passed), r.is_course ? yesNo(r.eval_submitted) : '',
      r.is_course ? yesNo(r.cert_earned) : '',
      r.completed_at && r.ce_hours ? r.ce_hours : null,
    ]),
  };
}

/** Column headers are the questions as the learner saw them, so the file explains itself. */
export function evaluationsTable(rows: PortalEvaluationRow[], portalName: string): ReportTable {
  return {
    sheet: 'Evaluations',
    header: ['Submitted', 'Name', 'Email', 'Organization', 'County', 'Zip',
      'Item', 'ID', 'Type', 'Library',
      ...RATING_ITEMS.map((i) => `${i.prompt} (0-10)`),
      ...TEXT_ITEMS.map((i) => i.prompt),
      CONTACT_ITEM.prompt, 'Contact email'],
    rows: rows.map((r) => [
      date(r.created_at), name(r), r.email, r.organization ?? '', r.county ?? '', r.zip ?? '',
      r.title ?? '(item removed)', r.course_code ?? '', typeLabel(r.type),
      r.on_portal ? portalName : 'Fletcher Group Library',
      ...RATING_ITEMS.map((i) => r[i.key]),
      ...TEXT_ITEMS.map((i) => r[i.key] ?? ''),
      yesNo(r.may_contact), r.contact_email ?? '',
    ]),
  };
}

export function tableToCsv(t: ReportTable): string {
  return toCsv(t.header, t.rows.map((row) => row.map((c) => (c instanceof Date ? c.toISOString() : c))));
}

export async function tableToXlsx(t: ReportTable, title: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet(t.sheet, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.addRow(t.header);
  ws.getRow(1).font = { bold: true };
  t.rows.forEach((row) => ws.addRow(row));
  ws.columns.forEach((col, i) => {
    const isDate = t.rows.some((row) => row[i] instanceof Date);
    if (isDate) col.numFmt = 'mmm d, yyyy h:mm AM/PM';
    const longest = Math.max(
      t.header[i].length,
      ...t.rows.slice(0, 500).map((row) => (row[i] instanceof Date ? 20 : String(row[i] ?? '').length)),
    );
    col.width = Math.min(60, Math.max(10, longest + 2));
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: t.header.length } };
  wb.title = title;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
