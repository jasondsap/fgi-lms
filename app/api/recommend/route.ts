// POST /api/recommend — library assistant
//
// Signed-in only. Takes a short conversation, hands Claude the whole catalog for
// the caller's surface, and returns validated recommendations.
//
// The model returns *slugs*, never URLs. Every slug is checked against the
// catalog before it leaves this route, so a hallucinated recommendation can't
// reach the client — the server builds the link from a row it already has.
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authEnabled, getSession } from '@/auth';
import { getCatalog, SURFACE_LABEL } from '@/lib/recommend';
import type { CatalogEntry } from '@/lib/recommend';
import { TENANT_SLUGS } from '@/lib/tenants';

export const dynamic = 'force-dynamic';

const MODEL = 'claude-opus-5';
const MAX_TURNS = 12;          // conversation history we accept from the client
const MAX_CHARS = 1000;        // per user message

const SYSTEM = `You are the library assistant for {SURFACE}. You help visitors find learning content that fits what they are working on.

You are given the complete catalog of everything available to this visitor. Each line is:
slug | id:<code> | L<level> type | duration | title — description | tags

Rules:
- Write in American English spelling — "neighbors", "colors", "organize" — never British spellings like "neighbours" or "colours".
- Recommend ONLY from the catalog. Never invent a resource, a slug, a title, or a topic that isn't there.
- Return the slug exactly as written in the catalog.
- Every resource has a six-character ID (two letters then four digits, e.g. ka7386) printed as "ID: …" on its page and shown after "id:" in its catalog line. When the visitor gives an ID, that exact resource is the answer — return it first, and if they asked what it is, describe it from its catalog line. If an ID they gave is not in the catalog, say so plainly and do not substitute a guess.
- Recommend at most 4, ordered best-first. Two strong matches beat four weak ones.
- L1-L4 is the content-importance level (L1 highest: courses, webinars, learning briefs, guides/handbooks; L2: podcasts, videos, publications; L3: newsletters, infographics; L4: success stories, external resources). When several resources fit the visitor's need about equally well, prefer the higher level and blend within a level. A clearly stronger topical match — especially one whose title contains what they asked about — outranks a higher level.
- If the catalog genuinely doesn't cover what they asked, return an empty recommendations list and say so plainly in your answer. Do not pad with loosely-related items — an honest "we don't have that yet" is more useful than a bad match, and helps us find the gap.
- If the question is vague, ask one specific clarifying question and return no recommendations.
- "why" is one sentence, addressed to the visitor, saying what they'll get from it. Don't restate the title.
- Your "answer" is 1-3 sentences of plain prose framing the recommendations. Don't list the titles in it — they're rendered separately as cards. Don't use markdown.
- Stay on the subject of this library: recovery housing, recovery support, and running these programs. If asked something unrelated, say that's outside what this library covers.
- You only have titles and descriptions, not the full content. Don't answer substantive questions from inside the material; point to the resource instead.`;

const SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string', description: 'Short prose reply to the visitor.' },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Exact slug from the catalog.' },
          why: { type: 'string', description: 'One sentence on why this fits.' },
        },
        required: ['slug', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['answer', 'recommendations'],
  additionalProperties: false,
} as const;

/** The card shape AskLibrary renders, built only from a catalog row we hold. */
function toCard(entry: CatalogEntry, why: string) {
  return {
    slug: entry.slug,
    title: entry.title,
    type: entry.type,
    durationMinutes: entry.duration_minutes,
    isNaadacCe: entry.is_naadac_ce,
    why,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Assistant is not configured.' }, { status: 503 });
    }
    // Signed-in only — bounds cost and abuse on a public domain.
    if (authEnabled && !(await getSession())) {
      return NextResponse.json({ error: 'Please sign in to use the assistant.' }, { status: 401 });
    }

    const body = await request.json();
    const surface: string =
      typeof body.surface === 'string' && TENANT_SLUGS.includes(body.surface) ? body.surface : 'fgi';

    const incoming: Array<{ role: string; content: string }> = Array.isArray(body.messages)
      ? body.messages
      : [];
    const messages = incoming
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_TURNS)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, MAX_CHARS),
      }));

    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'No question provided.' }, { status: 400 });
    }

    const catalog = await getCatalog(surface);
    if (!catalog.bySlug.size) {
      return NextResponse.json({ error: 'No content available to recommend.' }, { status: 503 });
    }

    // ID lookup (9-2-26, Jason): a visitor who pastes a resource ID ("ka7386",
    // "ID: ka7386") wants that row, not a judgment call, so it resolves here
    // against the catalog rather than trusting the model to copy it. A bare ID
    // skips the model entirely; an ID inside a longer question still goes to
    // the model (it can say what the resource is), but the referenced row is
    // pinned to the front of whatever comes back.
    const lastUser = messages[messages.length - 1].content.toLowerCase();
    const askedCodes = Array.from(new Set(lastUser.match(/\b[a-z]{2}[0-9]{4}\b/g) ?? []));
    const pinned = askedCodes
      .map((c) => catalog.byCode.get(c))
      .filter((e): e is CatalogEntry => e !== undefined);
    const unknownCodes = askedCodes.filter((c) => !catalog.byCode.has(c));
    const bareIdQuery = askedCodes.length > 0
      && lastUser.replace(/\b[a-z]{2}[0-9]{4}\b/g, '').replace(/\bids?\b/g, '').replace(/[^a-z]/g, '') === '';
    if (bareIdQuery) {
      const answer = [
        pinned.length === 1 ? `Here's the resource with ID ${pinned[0].course_code}.` : '',
        pinned.length > 1 ? 'Here are the resources for those IDs.' : '',
        unknownCodes.length > 0
          ? `No resource in this library has the ID ${unknownCodes.join(' or ')}. Check the code on the resource page — it's two letters followed by four digits.`
          : '',
      ].filter(Boolean).join(' ');
      return NextResponse.json({
        answer,
        recommendations: pinned.slice(0, 4).map((e) => toCard(e, `This is the resource with ID ${e.course_code}.`)),
      });
    }

    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      // Thinking is on by default on Opus 5 and max_tokens caps thinking +
      // output together, so leave headroom above what the JSON itself needs.
      max_tokens: 4000,
      output_config: {
        // Matching quality is the product here; `low` under-reads the question.
        // Tune down if latency becomes the complaint.
        effort: 'medium',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      system: [
        {
          type: 'text',
          text: SYSTEM.replace('{SURFACE}', SURFACE_LABEL[surface] ?? SURFACE_LABEL.fgi),
        },
        {
          // Catalog last and cached: it's the large, stable part of the prefix.
          type: 'text',
          text: `CATALOG (${catalog.bySlug.size} resources):\n${catalog.text}`,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
      ],
      messages,
    });

    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'No response generated.' }, { status: 502 });
    }

    let parsed: { answer?: string; recommendations?: Array<{ slug?: string; why?: string }> };
    try {
      parsed = JSON.parse(text.text);
    } catch {
      console.error('[recommend] non-JSON response', text.text.slice(0, 400));
      return NextResponse.json({ error: 'Could not read the response.' }, { status: 502 });
    }

    // The load-bearing step: drop anything not in the catalog we just sent, so a
    // hallucinated slug can never become a link. Dedupe while we're here.
    const seen = new Set<string>();
    const fromModel = (parsed.recommendations ?? [])
      .map((r) => {
        const entry = r.slug ? catalog.bySlug.get(r.slug) : undefined;
        if (!entry || seen.has(entry.slug)) return null;
        seen.add(entry.slug);
        return toCard(entry, String(r.why ?? '').slice(0, 400));
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    // Any resource the visitor named by ID leads, whether or not the model
    // repeated it.
    const recommendations = [
      ...pinned.filter((e) => !seen.has(e.slug)).map((e) => toCard(e, `This is the resource with ID ${e.course_code}.`)),
      ...fromModel,
    ].slice(0, 4);

    const dropped = (parsed.recommendations ?? []).length - fromModel.length;
    if (dropped > 0) console.warn(`[recommend] dropped ${dropped} unknown slug(s)`);

    return NextResponse.json({
      answer: String(parsed.answer ?? '').slice(0, 2000),
      recommendations,
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Busy right now — try again in a moment.' }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[recommend] bad ANTHROPIC_API_KEY');
      return NextResponse.json({ error: 'Assistant is not configured.' }, { status: 503 });
    }
    console.error('[recommend]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
