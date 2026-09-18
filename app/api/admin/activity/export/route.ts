// =============================================================================
// GET /api/admin/activity/export?user=<id>&days=N     one person's activity
// GET /api/admin/activity/export?resource=<id>&days=N  who accessed a resource
// CSV for the admin Activity pages (Jennifer, 9-17-26). Session role must be
// admin — same gate as the pages; never s3_key or anything presigned.
// =============================================================================
import { NextRequest } from 'next/server';
import {
  EVENT_LABEL, getResourceUsers, getUserEvents, parseRange, personName,
} from '@/lib/admin-activity';
import { toCsv } from '@/lib/csv';
import { sql } from '@/lib/db';
import { getUserProgress } from '@/lib/progress';
import { getUserById } from '@/lib/users';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/i;
const stamp = () => new Date().toISOString().slice(0, 10);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') return new Response('Not found', { status: 404 });

  const p = request.nextUrl.searchParams;
  const days = parseRange(p.get('days') ?? undefined);
  const userId = p.get('user');
  const resourceId = p.get('resource');

  if (userId && UUID.test(userId)) {
    const user = await getUserById(userId);
    if (!user) return new Response('Not found', { status: 404 });
    const [events, progress] = await Promise.all([getUserEvents(userId, days), getUserProgress(userId)]);
    const who = personName(user);
    const rows: unknown[][] = [
      ...progress.map((c) => [
        who, user.email, user.organization ?? '',
        c.completed_at ? 'Course completed' : 'Course started',
        c.title, c.course_code ?? '', c.surface,
        c.completed_at ?? c.started_at,
        c.completed_at ? 'Completed' : `${Math.round(c.pct)}%`,
        c.completed_at && c.ce_hours ? c.ce_hours : '',
      ]),
      ...events.map((e) => [
        who, user.email, user.organization ?? '',
        EVENT_LABEL[e.event] ?? e.event,
        e.title ?? '(resource removed)', e.course_code ?? '', e.surface,
        e.created_at, '', '',
      ]),
    ].sort((a, b) => String(b[7]).localeCompare(String(a[7])));
    const csv = toCsv(
      ['Name', 'Email', 'Organization', 'Action', 'Resource', 'ID', 'Site', 'When', 'Course status', 'CE hours'],
      rows,
    );
    return csvResponse(csv, `fgi-activity-${slugify(who)}-${stamp()}.csv`);
  }

  if (resourceId && UUID.test(resourceId)) {
    const [resource] = await sql`SELECT title, course_code FROM resources WHERE id = ${resourceId}`;
    if (!resource) return new Response('Not found', { status: 404 });
    const people = await getResourceUsers(resourceId, days);
    const csv = toCsv(
      ['Resource', 'ID', 'Name', 'Email', 'Organization', 'Views', 'Shares', 'Downloads',
        'First seen', 'Last seen', 'Course started', 'Course progress', 'Course completed'],
      people.map((u) => [
        resource.title, resource.course_code ?? '',
        personName(u), u.email, u.organization ?? '',
        u.views, u.shares, u.downloads,
        u.first_seen ?? '', u.last_seen ?? '',
        u.started_at ?? '', u.pct === null ? '' : `${Math.round(u.pct)}%`, u.completed_at ?? '',
      ]),
    );
    return csvResponse(csv, `fgi-activity-${slugify(String(resource.course_code ?? resource.title))}-${stamp()}.csv`);
  }

  return new Response('Missing user or resource', { status: 400 });
}
