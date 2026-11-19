'use server';
// =============================================================================
// Server actions for /admin/content (11-19-26). Module-level, never inline
// closures (see components/layout/auth-actions.ts). Admin-ness comes from
// users.role via getViewer, never from the caller — and nothing the browser
// sends is trusted as a storage key: keys are rebuilt here from the row.
// =============================================================================
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import {
  createDraft, getContentRow, isUuid, saveContent, setFileKey, setPublished,
} from '@/lib/admin-content';
import {
  CONTENT_TYPES, FILE_CONTENT_TYPE, IMAGE_URL, MAX_FILE_BYTES, MONTHS,
  fileKeyFor, newsletterSlug, podcastSlug,
  type ContentSaveInput, type ContentType,
} from '@/lib/admin-content-shared';
import { getPresignedUploadUrl, headObject } from '@/lib/s3';
import { getViewer } from '@/lib/viewer';
import { AUDIENCE_TAG_LABELS, TOPIC_TAG_LABELS } from '@/types';

type Result<T = {}> = ({ ok: true } & T) | { error: string };

async function isAdmin(): Promise<boolean> {
  return (await getViewer()).role === 'admin';
}

/** Everywhere a newly published or edited item can surface. */
function refresh(slug: string) {
  revalidatePath('/admin/content', 'layout');
  revalidatePath('/', 'layout');
  revalidatePath(`/resource/${slug}`);
}

export async function createContentAction(
  input:
    | { type: 'newsletter'; month: number; year: number; headline: string }
    | { type: 'podcast'; episode: number; title: string },
): Promise<Result<{ id: string; existed: boolean }>> {
  if (!(await isAdmin())) return { error: 'Not allowed.' };

  let slug: string;
  let title: string;
  if (input.type === 'newsletter') {
    const { month, year } = input;
    const headline = String(input.headline ?? '').trim();
    if (!Number.isInteger(month) || month < 1 || month > 12) return { error: 'Pick the issue month.' };
    if (!Number.isInteger(year) || year < 2020 || year > 2100) return { error: 'Enter the issue year.' };
    slug = newsletterSlug(month, year);
    // Recent public issues read "Month YYYY: Headline"; with no headline yet,
    // fall back to the archive form.
    title = headline ? `${MONTHS[month - 1]} ${year}: ${headline}` : `RCOE ${MONTHS[month - 1]} ${year} Newsletter`;
  } else if (input.type === 'podcast') {
    const episode = input.episode;
    const text = String(input.title ?? '').trim();
    if (!Number.isInteger(episode) || episode < 1 || episode > 999) return { error: 'Enter the episode number.' };
    if (!text) return { error: 'Enter the episode title.' };
    slug = podcastSlug(episode);
    title = /^episode\s+\d+/i.test(text) ? text : `Episode ${episode}: ${text}`;
  } else {
    return { error: 'Unknown content type.' };
  }

  const { id, created } = await createDraft({ type: input.type, slug, title: title.slice(0, 300) });
  if (created) revalidatePath('/admin/content', 'layout');
  return { ok: true, id, existed: !created };
}

export async function saveContentAction(
  id: string, input: ContentSaveInput,
): Promise<Result> {
  if (!(await isAdmin()) || !isUuid(id)) return { error: 'Not allowed.' };
  const row = await getContentRow(id);
  if (!row) return { error: 'Item not found.' };

  const title = String(input.title ?? '').trim();
  if (!title) return { error: 'The title can’t be empty.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.published_date) || Number.isNaN(Date.parse(input.published_date))) {
    return { error: 'Enter a valid date.' };
  }
  const duration = input.duration_minutes;
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1000)) {
    return { error: 'Length must be a whole number of minutes.' };
  }

  let guest = input.guest;
  if (row.type !== 'podcast') guest = undefined;
  if (guest) {
    if (!guest.name?.trim()) return { error: 'The guest needs a name (or choose “No guest”).' };
    for (const url of [guest.photo_url, guest.org_logo_url]) {
      if (url && !IMAGE_URL.test(url)) return { error: 'Guest image is not a valid upload.' };
    }
    if (guest.org_url && !/^https?:\/\/\S+$/i.test(guest.org_url.trim())) {
      return { error: 'The organization link must start with http:// or https://' };
    }
  }

  // Tags come from the fixed vocabularies in types/index.ts — anything else
  // is dropped rather than stored.
  const clean: ContentSaveInput = {
    title: title.slice(0, 300),
    description: String(input.description ?? '').replace(/\r\n/g, '\n').trim(),
    published_date: input.published_date,
    duration_minutes: row.type === 'podcast' ? duration : null,
    audience_tags: (input.audience_tags ?? []).filter((t) => t in AUDIENCE_TAG_LABELS),
    topic_tags: (input.topic_tags ?? []).filter((t) => t in TOPIC_TAG_LABELS),
    search_keywords: [...new Set((input.search_keywords ?? [])
      .map((k) => String(k).trim().toLowerCase()).filter(Boolean))].slice(0, 40),
    internal: Boolean(input.internal),
    pins: (input.pins ?? []).filter(isUuid),
    guest,
  };

  // A live item can't be saved into a state that would not have been allowed
  // to publish.
  if (row.published && !clean.description) return { error: 'A published item needs a description.' };

  await saveContent(id, clean);
  refresh(row.slug);
  return { ok: true };
}

export async function setPublishedAction(id: string, published: boolean): Promise<Result> {
  if (!(await isAdmin()) || !isUuid(id)) return { error: 'Not allowed.' };
  const row = await getContentRow(id);
  if (!row) return { error: 'Item not found.' };
  if (published) {
    if (!row.s3_key) return { error: `Upload the ${row.type === 'podcast' ? 'MP3' : 'PDF'} before publishing.` };
    if (!String(row.description ?? '').trim()) return { error: 'Add a description and save before publishing.' };
    // The page still renders when the object is missing — only the file 404s —
    // so check the object itself, not just the column.
    if (!(await headObject(row.s3_key))) return { error: 'The uploaded file can’t be found in storage — upload it again.' };
  }
  await setPublished(id, published);
  refresh(row.slug);
  return { ok: true };
}

/** Step 1 of a file upload: a presigned PUT for this item's canonical key. */
export async function presignFileAction(
  id: string,
): Promise<Result<{ url: string; contentType: string }>> {
  if (!(await isAdmin()) || !isUuid(id)) return { error: 'Not allowed.' };
  const row = await getContentRow(id);
  if (!row) return { error: 'Item not found.' };
  const type = row.type as ContentType;
  if (!CONTENT_TYPES.includes(type)) return { error: 'Unknown content type.' };
  const contentType = FILE_CONTENT_TYPE[type];
  const url = await getPresignedUploadUrl(fileKeyFor(type, row.slug), contentType);
  return { ok: true, url, contentType };
}

/**
 * Step 2: the browser says the PUT finished; confirm it against S3 before the
 * row points at the object. (8-13-26 lesson: a row whose s3_key names nothing
 * looks fine in the UI and only the file itself 404s.)
 */
export async function confirmFileAction(id: string): Promise<Result<{ size: number }>> {
  if (!(await isAdmin()) || !isUuid(id)) return { error: 'Not allowed.' };
  const row = await getContentRow(id);
  if (!row) return { error: 'Item not found.' };
  const type = row.type as ContentType;
  const key = fileKeyFor(type, row.slug);
  const head = await headObject(key);
  if (!head || head.size === 0) return { error: 'The upload did not arrive — try again.' };
  if (head.size > MAX_FILE_BYTES[type]) return { error: 'That file is larger than this page accepts.' };
  if (head.contentType !== FILE_CONTENT_TYPE[type]) return { error: 'That upload is not the right kind of file — try again.' };
  await setFileKey(id, key);
  refresh(row.slug);
  return { ok: true, size: head.size };
}

/** Presigned PUT for a guest headshot or org logo. The returned `path` is
    what gets stored on the presenter (served by app/media/[...key]). */
export async function presignImageAction(
  kind: 'photo' | 'logo', contentType: string,
): Promise<Result<{ url: string; path: string }>> {
  if (!(await isAdmin())) return { error: 'Not allowed.' };
  if (kind !== 'photo' && kind !== 'logo') return { error: 'Unknown image kind.' };
  const ext = contentType === 'image/webp' ? 'webp' : contentType === 'image/png' ? 'png' : null;
  if (!ext) return { error: 'Unsupported image format.' };
  const name = `${kind}-${randomUUID()}.${ext}`;
  const url = await getPresignedUploadUrl(`media/presenters/${name}`, contentType);
  return { ok: true, url, path: `/media/presenters/${name}` };
}
