// =============================================================================
// AI drafting help for /admin/content (11-19-26). SERVER-SIDE ONLY — the route
// app/api/admin/content/suggest does the admin check and loads the inputs;
// this module is just the three Claude calls, so they can be exercised
// without a signed-in request.
//
// All three only ever *suggest*: the admin sees the result in the editor and
// nothing is saved until they press Save.
//   - suggestNewsletter: read the issue PDF -> headline, card description,
//     tags, search keywords.
//   - suggestPodcastTags: title + description -> tags, keywords.
//   - extractPodcastNotes: pasted episode notes (the Information.docx text)
//     -> the form fields. Extraction only: it copies what the notes say and
//     leaves a field empty when they don't say it. It never composes a bio.
//
// Same safety property as the other assistants: tag values are validated
// against the vocabularies in types/index.ts before they are returned.
// =============================================================================
import Anthropic from '@anthropic-ai/sdk';
import { AUDIENCE_TAG_LABELS, TOPIC_TAG_LABELS } from '@/types';

/** A failure with a message that is safe to show the admin. */
export class AssistantError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

const MODEL = 'claude-opus-5-5';
// Base64 inflates by a third and the API takes 32 MB per request.
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_NOTES_CHARS = 40_000;

const AUDIENCE = Object.keys(AUDIENCE_TAG_LABELS);
const TOPIC = Object.keys(TOPIC_TAG_LABELS);

const vocabulary = () =>
  `AUDIENCE TAGS ("I am a…" — who the item is for):\n` +
  Object.entries(AUDIENCE_TAG_LABELS).map(([k, v]) => `- ${k}: ${v}`).join('\n') +
  `\n\nTOPIC TAGS ("I want to learn about…"):\n` +
  Object.entries(TOPIC_TAG_LABELS).map(([k, v]) => `- ${k}: ${v}`).join('\n');

const SYSTEM = `You help Fletcher Group, Inc. staff catalog new items in the FGI Learning Resource Center, a library about recovery housing and recovery support for people who run recovery homes, peer support professionals, and their communities.

Write in American English spelling. Plain text only, no markdown.

Tagging rules:
- Use only the tag keys listed below. Pick the few that genuinely fit — usually 1 to 3 topics and 0 to 2 audiences. An item written for everyone gets no audience tag.
- Search keywords are lowercase words or short phrases a visitor might type that do NOT already appear in the title or description: synonyms, acronyms spelled out, names of programs or models discussed. Up to 8. Return none rather than padding.

${vocabulary()}`;

const TAGS = {
  audience_tags: { type: 'array', items: { type: 'string', enum: AUDIENCE } },
  topic_tags: { type: 'array', items: { type: 'string', enum: TOPIC } },
  keywords: { type: 'array', items: { type: 'string' } },
} as const;

const NEWSLETTER_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'The issue’s main headline as printed, without the month or "Newsletter".' },
    description: { type: 'string', description: 'Library card description, 150–220 characters.' },
    ...TAGS,
  },
  required: ['headline', 'description', 'audience_tags', 'topic_tags', 'keywords'],
  additionalProperties: false,
} as const;

const TAGS_SCHEMA = {
  type: 'object',
  properties: { ...TAGS },
  required: ['audience_tags', 'topic_tags', 'keywords'],
  additionalProperties: false,
} as const;

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Episode title without any "Episode N:" prefix. Empty if not stated.' },
    release_date: { type: 'string', description: 'YYYY-MM-DD. Empty if not stated.' },
    duration_minutes: { type: 'integer', description: 'Length rounded UP to whole minutes. 0 if not stated.' },
    description: { type: 'string', description: 'The episode description exactly as written, paragraphs separated by a newline. Empty if not stated.' },
    guest_name: { type: 'string', description: 'Guest’s name without credentials. Empty if there is no guest.' },
    guest_credentials: { type: 'string', description: 'Post-nominal letters only, e.g. "PhD" or "MD". Empty if none.' },
    guest_title: { type: 'string', description: 'Role and organization on one line. Empty if not stated.' },
    guest_org_name: { type: 'string' },
    guest_org_url: { type: 'string', description: 'A link given for the guest or their organization. Empty if none.' },
    guest_bio: { type: 'string', description: 'The guest bio exactly as written. Empty if the notes contain no bio — do not write one.' },
  },
  required: ['title', 'release_date', 'duration_minutes', 'description', 'guest_name',
    'guest_credentials', 'guest_title', 'guest_org_name', 'guest_org_url', 'guest_bio'],
  additionalProperties: false,
} as const;

const cleanTags = (parsed: any) => ({
  audience_tags: [...new Set((parsed.audience_tags ?? []).filter((t: string) => AUDIENCE.includes(t)))] as string[],
  topic_tags: [...new Set((parsed.topic_tags ?? []).filter((t: string) => TOPIC.includes(t)))] as string[],
  keywords: [...new Set((parsed.keywords ?? [])
    .map((k: unknown) => String(k).trim().toLowerCase()).filter(Boolean))].slice(0, 8) as string[],
});


async function ask(
  schema: Record<string, unknown>, content: Anthropic.Beta.BetaContentBlockParam[],
): Promise<any> {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // If the model declines for policy reasons, the API retries on its
    // default fallback model inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema },
    },
    system: SYSTEM,
    messages: [{ role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') {
    throw new AssistantError('The assistant declined this one — fill it in by hand.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AssistantError('The assistant ran out of room — try again.');
  }
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new AssistantError('No suggestion came back.');
  try {
    return JSON.parse(text.text);
  } catch {
    console.error('[content-assistant] non-JSON response', text.text.slice(0, 400));
    throw new AssistantError('Could not read the suggestion.');
  }
}

export async function suggestNewsletter(pdf: Uint8Array) {
  const parsed = await ask(NEWSLETTER_SCHEMA, [
    {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: Buffer.from(pdf).toString('base64') },
    },
    {
      type: 'text',
      text: `This is an issue of the Fletcher Group RCOE monthly newsletter. Catalog it.

headline: the issue's main headline as printed on the first page, in title case, without the month, year or the word "Newsletter".

description: one or two sentences, 150 to 220 characters, for the library card and search. Say who is featured and what the issue actually covers, concretely — the people, the argument, the practical takeaways. Do not open with "This issue" or "In this newsletter". Two examples of the house style:
- Seed Sower CEO Jay Phillips on braided funding — why grants alone leave a non-profit precarious, how a revenue-positive transport service pays for recovery housing, and data-driven storytelling.
- Co-occurring disorder expert Geoff Wilson on dual diagnosis — how common it is, the barriers that keep it untreated, and what works best in rural communities.`,
    },
  ]);
  return {
    headline: String(parsed.headline ?? '').trim().slice(0, 200),
    description: String(parsed.description ?? '').trim().slice(0, 600),
    ...cleanTags(parsed),
  };
}

export async function suggestPodcastTags(title: string, description: string) {
  const parsed = await ask(TAGS_SCHEMA, [{
    type: 'text',
    text: `Suggest tags and search keywords for this episode of Recovery Ecosystem Radio, the Fletcher Group podcast hosted by Tony White. Every episode is about recovery ecosystems, so include recovery_ecosystems.\n\nTITLE: ${title}\n\nDESCRIPTION:\n${description}`,
  }]);
  return cleanTags(parsed);
}

export async function extractPodcastNotes(notes: string) {
  const parsed = await ask(EXTRACT_SCHEMA, [{
    type: 'text',
    text: `Below are the notes for one episode of Recovery Ecosystem Radio, pasted from its information sheet. Pull the fields out of them. Copy wording exactly — do not rewrite, summarize or improve it — and leave a field empty when the notes do not state it. Never invent a bio, a date or a link.\n\nNOTES:\n${notes}`,
  }]);
  const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const date = str(parsed.release_date, 10);
  const minutes = Number(parsed.duration_minutes);
  const url = str(parsed.guest_org_url, 500);
  return {
    title: str(parsed.title, 300),
    release_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    duration_minutes: Number.isInteger(minutes) && minutes > 0 && minutes < 1000 ? minutes : null,
    description: str(parsed.description, 6000),
    guest: {
      name: str(parsed.guest_name, 200),
      credentials: str(parsed.guest_credentials, 100),
      title: str(parsed.guest_title, 300),
      org_name: str(parsed.guest_org_name, 200),
      org_url: /^https?:\/\/\S+$/i.test(url) ? url : '',
      bio: str(parsed.guest_bio, 6000),
    },
  };
}
