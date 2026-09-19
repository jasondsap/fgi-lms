// =============================================================================
// Portal Admin — evaluation answers (phase 2, 9-19-26). "By item w/ user
// info" (Jennifer): a per-item roll-up of the five 0-10 ratings first, then
// every response with who gave it and what they wrote. Server-safe, no hooks;
// shared by the Evaluations tab and the single-user page.
// =============================================================================
import Link from 'next/link';
import { CARD, NUM, SectionTitle, TD, TH, fmtDate } from '@/components/admin/activity-ui';
import { RATING_ITEMS, TEXT_ITEMS } from '@/lib/evaluation-items';
import {
  summarizeEvaluations, type PortalEvaluationRow,
} from '@/lib/portal-admin';

/** Column headings for the five ratings — the full wording is in the legend and the export. */
const SHORT: Record<(typeof RATING_ITEMS)[number]['key'], string> = {
  made_sense: 'Made sense',
  can_apply: 'Can apply',
  presented_well: 'Presented well',
  overall_impression: 'Overall',
  would_recommend: 'Recommend',
};

const personName = (p: { given_name: string | null; family_name: string | null; email: string }) =>
  [p.given_name, p.family_name].filter(Boolean).join(' ') || p.email;

export default function EvaluationsView({
  rows, base, accent, showPerson = true, pageRows = 500,
}: {
  rows: PortalEvaluationRow[];
  /** `/<portal>/admin` — person links. */
  base: string;
  accent: string;
  /** False on the single-user page, where every row is the same person. */
  showPerson?: boolean;
  pageRows?: number;
}) {
  const summary = summarizeEvaluations(rows);
  return (
    <>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 10px' }}>
        Ratings are 0–10.{' '}
        {RATING_ITEMS.map((i) => `${SHORT[i.key]}: “${i.prompt}”`).join(' · ')}
      </p>

      {showPerson && summary.length > 0 && (
        <>
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Item</th>
                  <th style={TH}>ID</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Responses</th>
                  {RATING_ITEMS.map((i) => (
                    <th key={i.key} style={{ ...TH, textAlign: 'right' }} title={i.prompt}>Avg · {SHORT[i.key]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.resource_id ?? s.title}>
                    <td style={TD}>{s.title}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{s.course_code ?? '—'}</td>
                    <td style={NUM}>{s.responses}</td>
                    {RATING_ITEMS.map((i) => <td key={i.key} style={NUM}>{s[i.key].toFixed(1)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SectionTitle>Every response</SectionTitle>
        </>
      )}

      <div style={{ ...CARD, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Submitted</th>
              {showPerson && <th style={TH}>Person</th>}
              <th style={TH}>Item</th>
              {RATING_ITEMS.map((i) => (
                <th key={i.key} style={{ ...TH, textAlign: 'right' }} title={i.prompt}>{SHORT[i.key]}</th>
              ))}
              <th style={TH}>May contact</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, pageRows).map((r) => {
              const comments = TEXT_ITEMS.filter((t) => r[t.key]);
              // The comments ride in a second row of the same record, so the
              // pair shares one bottom border.
              const cell = comments.length ? { ...TD, borderBottom: 'none' } : TD;
              const num = comments.length ? { ...NUM, borderBottom: 'none' } : NUM;
              return [
                <tr key={r.id}>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                  {showPerson && (
                    <td style={cell}>
                      <Link href={`${base}/user/${r.user_id}`} style={{ color: accent, fontWeight: 700, textDecoration: 'none' }}>
                        {personName(r)}
                      </Link>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.organization || r.email}</div>
                    </td>
                  )}
                  <td style={cell}>
                    {r.title ?? '(item removed)'}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.course_code ?? ''}</div>
                  </td>
                  {RATING_ITEMS.map((i) => <td key={i.key} style={num}>{r[i.key]}</td>)}
                  <td style={cell}>
                    {r.may_contact ? 'Yes' : 'No'}
                    {r.may_contact && r.contact_email && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{r.contact_email}</div>
                    )}
                  </td>
                </tr>,
                comments.length > 0 && (
                  <tr key={`${r.id}:comments`}>
                    <td style={{ ...TD, paddingTop: 0 }} />
                    <td colSpan={showPerson ? 8 : 7} style={{ ...TD, paddingTop: 0, fontSize: '13px', lineHeight: 1.5 }}>
                      {comments.map((t) => (
                        <div key={t.key} style={{ marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{t.prompt}</span>{' '}
                          <span style={{ whiteSpace: 'pre-wrap' }}>{r[t.key]}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
