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
import { TENANT_SLUGS } from '@/lib/tenants';

export const dynamic = 'force-dynamic';

const MODEL = 'claude-opus-5';
const MAX_TURNS = 12;          // conversation history we accept from the client
const MAX_CHARS = 1000;        // per user message

const SYSTEM = `You are the library assistant for {SURFACE}. You help visitors find learning content that fits what they are working on.

You are given the complete catalog of everything available to this visitor. Each line is:
slug | type | duration | title — description

Rules:
- Recommend ONLY from the catalog. Never invent a resource, a slug, a title, or a topic that isn't there.
- Return the slug exactly as written in the catalog.
- Recommend at most 4, ordered best-first. Two strong matches beat four weak ones.
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
    const recommendations = (parsed.recommendations ?? [])
      .map((r) => {
        const entry = r.slug ? catalog.bySlug.get(r.slug) : undefined;
        if (!entry || seen.has(entry.slug)) return null;
        seen.add(entry.slug);
        return {
          slug: entry.slug,
          title: entry.title,
          type: entry.type,
          durationMinutes: entry.duration_minutes,
          isNaadacCe: entry.is_naadac_ce,
          why: String(r.why ?? '').slice(0, 400),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .slice(0, 4);

    const dropped = (parsed.recommendations ?? []).length - recommendations.length;
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
