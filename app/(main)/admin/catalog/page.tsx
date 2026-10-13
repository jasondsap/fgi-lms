import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { searchCatalog } from '@/lib/admin-catalog';
import { getViewer } from '@/lib/viewer';
import { RESOURCE_TYPE_LABELS } from '@/types';

export const metadata: Metadata = { title: 'Catalog — Admin — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

const PORTAL_NAMES: Record<string, string> = { fgi: 'Fletcher Group', colorado: 'Colorado', scarr: 'SCARR' };
const TH: React.CSSProperties = {
  textAlign: 'left', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '8px 10px',
  borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = {
  fontSize: '14px', padding: '9px 10px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'top',
};
const BTN: React.CSSProperties = {
  display: 'inline-block', background: 'var(--fgi-navy)', color: '#ffffff', textDecoration: 'none',
  fontSize: '13.5px', fontWeight: 700, padding: '8px 16px', borderRadius: '999px',
};

/**
 * Admin catalog (10-12-26, Jennifer's burn-down): the whole-library Excel /
 * CSV export, and a literal word search across every item's title,
 * description, abstract, citation, keywords and ID (row 17 — "search a word
 * such as DEI on the back side and see everything that contains that word").
 */
export default async function AdminCatalogPage({
  searchParams,
}: { searchParams: Record<string, string | string[] | undefined> }) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();

  const q = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q ?? '').trim();
  const hits = q ? await searchCatalog(q) : [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <p style={{ fontSize: '13px', margin: '0 0 8px' }}>
        <Link href="/admin" style={{ color: 'var(--fgi-blue)' }}>← Admin</Link>
      </p>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 4px' }}>Catalog</h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Every item in the library — ID, type, filters, tags, and which portals it&#39;s on.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '28px' }}>
        <a href="/api/admin/catalog/export" style={BTN}>Download Excel</a>
        <a href="/api/admin/catalog/export?format=csv" style={{ ...BTN, background: 'var(--fgi-blue)' }}>Download CSV</a>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Two sheets: Catalog (one row per item) and Filter key (every checkbox → key → surface).
        </span>
      </div>

      <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 6px' }}>Word search</h2>
      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
        Exact, case-insensitive match anywhere in the title, description, abstract, citation, search keywords or ID.
        Unpublished and internal items are included.
      </p>
      <form method="get" action="/admin/catalog" style={{ display: 'flex', gap: '8px', marginBottom: '18px', maxWidth: '560px' }}>
        <input
          type="search" name="q" defaultValue={q} placeholder="e.g. DEI" aria-label="Word to search for"
          style={{
            flex: 1, fontSize: '15px', padding: '9px 12px', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', fontFamily: 'inherit',
          }}
        />
        <button type="submit" style={{ ...BTN, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Search</button>
      </form>

      {q && (
        <>
          <p style={{ fontSize: '14px', margin: '0 0 10px' }}>
            <strong>{hits.length}</strong> item{hits.length === 1 ? '' : 's'} contain &ldquo;{q}&rdquo;
            {hits.length >= 500 ? ' (showing the first 500)' : ''}.
          </p>
          {hits.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={TH}>ID</th><th style={TH}>Title</th><th style={TH}>Type</th>
                    <th style={TH}>Found in</th><th style={TH}>Portals</th><th style={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hits.map((h) => (
                    <tr key={h.id}>
                      <td style={{ ...TD, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{h.course_code ?? '—'}</td>
                      <td style={TD}>
                        <Link href={`/resource/${h.slug}`} style={{ color: 'var(--fgi-blue)', fontWeight: 600 }}>{h.title}</Link>
                        {h.snippet && (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>{h.snippet}</div>
                        )}
                      </td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{RESOURCE_TYPE_LABELS[h.type] ?? h.type}</td>
                      <td style={TD}>{h.matched.join(', ')}</td>
                      <td style={TD}>{(h.portals ?? []).map((s) => PORTAL_NAMES[s] ?? s).join(', ') || '—'}</td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                        {h.published ? 'Published' : 'Unpublished'}{h.internal ? ' · Internal' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
