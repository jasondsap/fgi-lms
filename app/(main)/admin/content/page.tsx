import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ContentCreate from '@/components/admin/ContentCreate';
import { listContent } from '@/lib/admin-content';
import { getViewer } from '@/lib/viewer';
import { RESOURCE_TYPE_COLORS, RESOURCE_TYPE_LABELS } from '@/types';

export const metadata: Metadata = { title: 'Add Content — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

/**
 * Self-serve content loading (Jason, 11-19-26): Jennifer adds each month's
 * newsletter and podcast episode here instead of handing the files off.
 * users.role = 'admin' only; everyone else 404s. Webinars are not here —
 * each needs a Moodle course build.
 */
export default async function AdminContentPage() {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();

  const items = await listContent();
  const drafts = items.filter((i) => !i.published);
  const live = items.filter((i) => i.published);
  const nextEpisode = 1 + Math.max(0, ...items
    .map((i) => Number(i.slug.match(/^recovery-ecosystem-radio-episode-(\d+)$/)?.[1] ?? 0)));

  const th: React.CSSProperties = {
    textAlign: 'left', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--text-secondary)', padding: '8px 10px',
    borderBottom: '1px solid var(--border-color)',
  };
  const td: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid var(--border-color)', fontSize: '14px', verticalAlign: 'top' };

  const table = (rows: typeof items) => (
    <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th style={th}>Type</th><th style={th}>Title</th><th style={th}>Date</th><th style={th}>ID</th><th style={th} /></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: 600, color: RESOURCE_TYPE_COLORS[r.type] }}>
                {RESOURCE_TYPE_LABELS[r.type]}
              </td>
              <td style={td}>
                <Link href={`/admin/content/${r.id}`} style={{ color: 'var(--fgi-navy)', fontWeight: 600, textDecoration: 'none' }}>
                  {r.title}
                </Link>
                {r.internal && <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 700, color: '#8a6410' }}>INTERNAL</span>}
                {!r.has_file && <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 700, color: '#b3261e' }}>NO FILE YET</span>}
              </td>
              <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{r.published_date}</td>
              <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{r.course_code ?? '—'}</td>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>
                <Link href={`/admin/content/${r.id}`} style={{ color: 'var(--fgi-blue)', fontWeight: 600 }}>Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const h2: React.CSSProperties = { fontSize: '18px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '28px 0 10px' };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '14px' }}>
        <Link href="/admin" style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>← Admin</Link>
      </div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 4px' }}>Add Content</h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.55 }}>
        Load a newsletter or a podcast episode yourself. Starting a draft publishes nothing — you upload the file,
        fill in the details, preview the page, and publish when it looks right. Published items can be edited here
        at any time.
      </p>

      <ContentCreate nextEpisode={nextEpisode} />

      {drafts.length > 0 && (
        <>
          <h2 style={h2}>Drafts <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '14px' }}>— not visible to anyone but admins</span></h2>
          {table(drafts)}
        </>
      )}

      <h2 style={h2}>Published <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '14px' }}>— {live.length} newsletters and episodes</span></h2>
      {table(live)}
    </div>
  );
}
