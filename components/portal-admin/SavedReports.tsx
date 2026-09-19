// =============================================================================
// Portal Admin — saved reports and their schedules (phase 3, 9-19-26).
// Server-safe: every control is a plain <form> posting to a module-level
// server action (report-actions.ts), so nothing here needs client JS.
// A person sees only the reports they saved; scheduled emails go to their own
// account address.
// =============================================================================
import Link from 'next/link';
import { BTN, CARD, Empty, fmtDate } from '@/components/admin/activity-ui';
import { filterQuery } from '@/lib/portal-admin';
import {
  FREQUENCIES, REPORT_KINDS, describeFilters, savedFilters, type ReportKind, type SavedReport,
} from '@/lib/portal-reports';
import {
  deleteReportAction, saveReportAction, sendReportNowAction, updateScheduleAction,
} from './report-actions';

const FIELD: React.CSSProperties = {
  padding: '7px 10px', fontSize: '13.5px', fontFamily: 'inherit',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
  background: '#fff', color: 'var(--text-primary)',
};

const kindLabel = (k: string) => REPORT_KINDS.find((r) => r.value === k)?.label ?? k;
const openHref = (base: string, r: SavedReport) => `${base}?${filterQuery(savedFilters(r), { tab: r.report })}`;

/** Under the filter bar on each report tab: jump to a saved report, or save the current view. */
export function SaveBar({
  portal, base, report, query, saved, accent,
}: {
  portal: string; base: string; report: ReportKind; query: string; saved: SavedReport[]; accent: string;
}) {
  const here = saved.filter((r) => r.report === report);
  return (
    <div className="no-print" style={{ display: 'flex', gap: '10px 14px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
      <form action={saveReportAction} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input type="hidden" name="portal" value={portal} />
        <input type="hidden" name="report" value={report} />
        <input type="hidden" name="query" value={query} />
        <input
          name="name" required maxLength={80} placeholder="Name this view to save it…"
          aria-label="Name for the saved report" style={{ ...FIELD, width: '230px' }}
        />
        <button type="submit" style={{ ...BTN, borderColor: accent, color: accent }}>Save report</button>
      </form>
      {here.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Saved
          </span>
          {here.map((r) => (
            <Link
              key={r.id}
              href={openHref(base, r)}
              style={{ ...BTN, padding: '5px 12px', fontSize: '12.5px', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              {r.name}{r.frequency ? ' ✉' : ''}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** The "Saved reports" tab. */
export default function SavedReports({
  portal, base, saved, accent, ownerEmail,
}: {
  portal: string; base: string; saved: SavedReport[]; accent: string; ownerEmail: string;
}) {
  if (saved.length === 0) {
    return (
      <Empty>
        No saved reports yet. On Users, Progress or Evaluations, set the filters you want, type a name under
        the filter bar and choose Save report. A saved report can then be emailed to you every week or month.
      </Empty>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
        These are your own saved reports. Scheduled reports are emailed to <strong>{ownerEmail}</strong> only —
        weekly on Mondays or monthly on the 1st, in the morning (US time).
      </p>
      {saved.map((r) => {
        const summary = describeFilters(savedFilters(r), r.report);
        return (
          <div key={r.id} style={{ ...CARD, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <Link href={openHref(base, r)} style={{ fontSize: '15.5px', fontWeight: 700, color: accent, textDecoration: 'none' }}>
                  {r.name}
                </Link>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginLeft: '10px' }}>
                  {kindLabel(r.report)} report
                </span>
              </div>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                {r.frequency
                  ? `Next email ${fmtDate(r.next_run_at)}${r.last_sent_at ? ` · last sent ${fmtDate(r.last_sent_at)}` : ''}`
                  : 'Not scheduled'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {summary.length ? summary.join(' · ') : 'No filters — everyone on the portal.'}
            </div>

            <div style={{ display: 'flex', gap: '10px 16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <form action={updateScheduleAction} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="hidden" name="portal" value={portal} />
                <input type="hidden" name="id" value={r.id} />
                <select name="frequency" defaultValue={r.frequency ?? ''} style={FIELD} aria-label="Email schedule">
                  <option value="">Don’t email</option>
                  {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select name="format" defaultValue={r.format} style={FIELD} aria-label="File format">
                  <option value="xlsx">Excel</option>
                  <option value="csv">CSV</option>
                </select>
                <label style={{ fontSize: '13px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                  <input type="checkbox" name="period_only" defaultChecked={r.period_only} style={{ accentColor: accent }} />
                  Only the past week / month
                </label>
                <button type="submit" style={{ ...BTN, background: accent, borderColor: accent, color: '#fff' }}>
                  Save schedule
                </button>
              </form>

              <form action={sendReportNowAction}>
                <input type="hidden" name="portal" value={portal} />
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" style={{ ...BTN, borderColor: accent, color: accent }}>Email it to me now</button>
              </form>
              <form action={deleteReportAction} style={{ marginLeft: 'auto' }}>
                <input type="hidden" name="portal" value={portal} />
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" style={{ ...BTN, borderColor: 'var(--border-color)', color: '#c62828' }}>Delete</button>
              </form>
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
        “Only the past week / month” sends just that period, applied to the report’s date setting (item accessed,
        item completed, evaluation submitted, or account created). Unticked, each email carries everything the
        filters match.
      </p>
    </div>
  );
}
