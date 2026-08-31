// POST /api/help-assistant — Fletch's help mode (/help page)
//
// Sibling of /api/recommend with the same shape and the same safety property:
// the model is handed the entire help corpus (lib/help-content.ts, shared with
// the /help page) and returns *topic ids*, never links. Every id is validated
// against the corpus before it leaves this route, so a hallucinated topic can
// never become a link. Unlike the recommender, the corpus here contains the
// actual steps, so the answer itself walks the visitor through the task.
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authEnabled, getSession } from '@/auth';
import { helpCorpus, HELP_TOPICS_BY_ID } from '@/lib/help-content';

export const dynamic = 'force-dynamic';

const MODEL = 'claude-opus-5';
const MAX_TURNS = 12;
const MAX_CHARS = 1000;

const SYSTEM = `You are Fletch, the friendly help assistant for the Fletcher Group Learning Resource Center. You answer "how do I…" questions about using the site.

You are given the complete Help Center content. Answer ONLY from it.

Rules:
- Answer the question directly and concisely: 2-6 short sentences. When the answer is a procedure, give the steps as plain numbered text ("1. … 2. …"). No markdown formatting.
- Cite up to 3 relevant help topics by their exact id — they render as cards linking to the full write-up. Don't repeat the whole topic in your answer.
- "why" is one short sentence on what that topic covers for them.
- If the help content doesn't cover the question, say so plainly, return no topics, and point them to Learning Center Support (the email is in the content). Never invent features, buttons, or steps.
- If the question is about finding learning content (courses, webinars, resources on a subject), say that the Ask Fletch assistant on the Library page handles resource recommendations, and suggest they ask there.
- Stay on the subject of using this site. If asked something unrelated, say that's outside what this help assistant covers.`;

const SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string', description: 'Direct, concise answer to the visitor.' },
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Exact topic id from the help content.' },
          why: { type: 'string', description: 'One sentence on what this topic covers.' },
        },
        required: ['id', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['answer', 'topics'],
  additionalProperties: false,
} as const;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Assistant is not configured.' }, { status: 503 });
    }
    // Signed-in only, same as the recommender — bounds cost and abuse on a
    // public domain. The static help page above stays fully public.
    if (authEnabled && !(await getSession())) {
      return NextResponse.json({ error: 'Please sign in to use the assistant.' }, { status: 401 });
    }

    const body = await request.json();
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

    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      system: [
        { type: 'text', text: SYSTEM },
        {
          // Corpus last and cached — the large, stable part of the prefix.
          type: 'text',
          text: `HELP CENTER CONTENT:\n${helpCorpus()}`,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
      ],
      messages,
    });

    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'No response generated.' }, { status: 502 });
    }

    let parsed: { answer?: string; topics?: Array<{ id?: string; why?: string }> };
    try {
      parsed = JSON.parse(text.text);
    } catch {
      console.error('[help-assistant] non-JSON response', text.text.slice(0, 400));
      return NextResponse.json({ error: 'Could not read the response.' }, { status: 502 });
    }

    // The load-bearing step: only topics from the corpus we just sent.
    const seen = new Set<string>();
    const topics = (parsed.topics ?? [])
      .map((t) => {
        const entry = t.id ? HELP_TOPICS_BY_ID.get(t.id) : undefined;
        if (!entry || seen.has(entry.id)) return null;
        seen.add(entry.id);
        return {
          id: entry.id,
          name: entry.name,
          category: entry.category,
          why: String(t.why ?? '').slice(0, 400),
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .slice(0, 3);

    return NextResponse.json({
      answer: String(parsed.answer ?? '').slice(0, 2000),
      topics,
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Busy right now — try again in a moment.' }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[help-assistant] bad ANTHROPIC_API_KEY');
      return NextResponse.json({ error: 'Assistant is not configured.' }, { status: 503 });
    }
    console.error('[help-assistant]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
