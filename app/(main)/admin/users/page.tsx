import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import UsersView from '@/components/admin/UsersView';
import { listUsers } from '@/lib/admin-users';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Users — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

/** Admin user management (Jason, 8-31-26) — role + home portal per account. */
export default async function AdminUsersPage() {
  const viewer = await getViewer();
  if (viewer.role !== 'admin' || !viewer.userId) notFound();

  const users = await listUsers();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '14px' }}>
        <Link href="/admin" style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>
          ← Admin
        </Link>
      </div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 4px' }}>
        Users
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Every Learning Resource Center account — set each person&#39;s role and home portal.
        Accounts are created by signing up on the site.
      </p>
      <UsersView users={users} selfId={viewer.userId} />
    </div>
  );
}
