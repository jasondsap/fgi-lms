import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ContentEditor from '@/components/admin/ContentEditor';
import {
  getContentItem, getGuestId, getPinOptions, getPins, listPresenters,
} from '@/lib/admin-content';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Edit Content — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

/** Editor for one newsletter or podcast episode (11-19-26). Admin only. */
export default async function AdminContentEditPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { existing?: string } }) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();

  const item = await getContentItem(params.id);
  if (!item) notFound();

  const isPodcast = item.type === 'podcast';
  const [pins, pinOptions, presenters, guestId] = await Promise.all([
    getPins(item.id),
    getPinOptions(item.id),
    isPodcast ? listPresenters() : Promise.resolve([]),
    isPodcast ? getGuestId(item.id) : Promise.resolve(null),
  ]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '14px' }}>
        <Link href="/admin/content" style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>
          ← Add Content
        </Link>
      </div>
      <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 4px' }}>{item.title}</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 18px' }}>
        Page address: /resource/{item.slug}
      </p>
      {searchParams.existing && (
        <div style={{
          background: '#fdf3dd', border: '1px solid #f1dfae', color: '#6b5a2a', borderRadius: 'var(--radius-md)',
          padding: '10px 16px', marginBottom: '16px', fontSize: '14px',
        }}>
          This one was already here, so no new draft was made — you&#39;re editing the existing item.
        </div>
      )}
      {/* key: a fresh editor per item, so state never carries across a navigation */}
      <ContentEditor
        key={item.id} item={item} pins={pins} pinOptions={pinOptions}
        presenters={presenters} guestId={guestId}
      />
    </div>
  );
}
