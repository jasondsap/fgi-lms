// POST /api/admin/content/suggest — AI drafting help for /admin/content
//
// Admin check + input loading only; the Claude calls live in
// lib/content-assistant.ts. Every mode only *suggests* — the editor shows the
// result and nothing is saved until the admin presses Save.
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getContentRow, isUuid } from '@/lib/admin-content';
import {
  AssistantError, MAX_NOTES_CHARS, MAX_PDF_BYTES,
  extractPodcastNotes, suggestNewsletter, suggestPodcastTags,
} from '@/lib/content-assistant';
import { getObjectBytes } from '@/lib/s3';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  try {
    if ((await getViewer()).role !== 'admin') return fail('Not allowed.', 401);
    if (!process.env.ANTHROPIC_API_KEY) return fail('The assistant is not configured.', 503);

    const body = await request.json();
    const mode = String(body.mode ?? '');

    if (mode === 'newsletter') {
      const row = isUuid(body.id) ? await getContentRow(body.id) : null;
      if (!row || row.type !== 'newsletter') return fail('Item not found.', 404);
      if (!row.s3_key) return fail('Upload the PDF first.', 400);
      const pdf = await getObjectBytes(row.s3_key);
      if (!pdf) return fail('The PDF can’t be found in storage — upload it again.', 400);
      if (pdf.bytes.byteLength > MAX_PDF_BYTES) {
        return fail('This PDF is too large for the assistant to read — write the description by hand.', 413);
      }
      return NextResponse.json(await suggestNewsletter(pdf.bytes));
    }

    if (mode === 'podcast-tags') {
      const title = String(body.title ?? '').slice(0, 400);
      const description = String(body.description ?? '').slice(0, 6000);
      if (!description.trim()) return fail('Add the episode description first.', 400);
      return NextResponse.json(await suggestPodcastTags(title, description));
    }

    if (mode === 'podcast-extract') {
      const notes = String(body.text ?? '');
      if (!notes.trim()) return fail('Paste the episode notes first.', 400);
      if (notes.length > MAX_NOTES_CHARS) {
        return fail('That is more text than the assistant takes at once — paste just the episode’s information sheet.', 413);
      }
      return NextResponse.json(await extractPodcastNotes(notes));
    }

    return fail('Unknown request.', 400);
  } catch (err) {
    if (err instanceof AssistantError) return fail(err.message, err.status);
    if (err instanceof Anthropic.RateLimitError) return fail('Busy right now — try again in a moment.', 429);
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[content/suggest] bad ANTHROPIC_API_KEY');
      return fail('The assistant is not configured.', 503);
    }
    if (err instanceof Anthropic.APIError) {
      console.error('[content/suggest] API error', err.status, err.message);
      return fail('The assistant could not process this — fill it in by hand or try again.', 502);
    }
    console.error('[content/suggest]', err);
    return fail('Something went wrong.', 500);
  }
}
