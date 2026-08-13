// Mailchimp list subscription, done server-side so the visitor never leaves
// the site.
//
// Jennifer supplied the classic Mailchimp embed (8-13-26), which posts to
// list-manage.com with target="_blank" and pulls in jQuery, mc-validate.js and
// a stylesheet. None of that is used: the browser cannot POST to list-manage
// and read the reply (no CORS headers), so the form posts to our own
// /api/subscribe and this module makes the call from the server, where the
// same-origin policy does not apply.
//
// The endpoint is list-manage's `post-json`, the one the classic embed's own
// AJAX mode uses. It answers with JSONP — `callback({...})` — so the wrapper is
// stripped below. It needs no API key, which is why it is preferred here over
// the Marketing API: nothing new has to be kept secret.
//
// These three IDs are not credentials. They are public values, visible in the
// embed code on any page that carries the form, and they only identify which
// audience a subscribe request is for.
const AUDIENCE = {
  u:    '920c4fe7f0dead37ebaa7057b',
  id:   '342805a659',
  f_id: '007f5ae4f0',
};

/** "Learning Resource Center" on the audience. Applied to every signup here. */
const TAG = '14478783';

/**
 * Mailchimp's honeypot: a field positioned off-screen in the real embed, which
 * a human never fills in and a naive bot does. Its name is derived from the
 * audience IDs, so it is reproduced rather than invented.
 */
export const HONEYPOT_FIELD = `b_${AUDIENCE.u}_${AUDIENCE.id}`;

const ENDPOINT = 'https://fletchergroup.us10.list-manage.com/subscribe/post-json';

export type SubscribeOutcome =
  | { status: 'subscribed'; message: string }
  | { status: 'already';    message: string }
  | { status: 'invalid';    message: string };

export class MailchimpError extends Error {}

/**
 * Mailchimp's messages are written for its own hosted page: they arrive as
 * HTML, and errors carry a leading field index ("0 - An email address must
 * contain a single @"). Both are stripped so the text can be dropped into the
 * modal as plain text — which also means no untrusted markup is ever rendered.
 */
function plainText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/g, "'")
    .replace(/^\s*\d+\s*-\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Subscribing an address that is already on the list is not a failure the
 * visitor can act on, and Mailchimp's own wording for it ends in a link to a
 * profile-update page we are not showing. It gets its own outcome so the modal
 * can say something true and calm instead.
 */
function isAlreadySubscribed(message: string): boolean {
  return /already subscribed/i.test(message);
}

export async function subscribe(email: string): Promise<SubscribeOutcome> {
  const query = new URLSearchParams({
    ...AUDIENCE,
    EMAIL: email,
    tags: TAG,
    [HONEYPOT_FIELD]: '',
    c: 'cb',           // JSONP callback name, stripped below
  });

  let body: string;
  try {
    const response = await fetch(`${ENDPOINT}?${query}`, {
      // list-manage is a third party; without a bound this hangs the route.
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'FGI-Learning-Resource-Center' },
      cache: 'no-store',
    });
    if (!response.ok) throw new MailchimpError(`list-manage returned ${response.status}`);
    body = await response.text();
  } catch (error) {
    if (error instanceof MailchimpError) throw error;
    throw new MailchimpError(
      error instanceof Error ? error.message : 'list-manage did not respond',
    );
  }

  // `cb({...})` — take what is between the first ( and the last ).
  const open = body.indexOf('(');
  const close = body.lastIndexOf(')');
  if (open === -1 || close <= open) {
    throw new MailchimpError('unrecognised reply from list-manage');
  }

  let parsed: { result?: string; msg?: string };
  try {
    parsed = JSON.parse(body.slice(open + 1, close));
  } catch {
    throw new MailchimpError('unparseable reply from list-manage');
  }

  const message = plainText(parsed.msg);

  // Mailchimp's own success wording is shown as-is, because it is the only
  // thing that knows whether this audience is single or double opt-in. Today it
  // is single ("Thank you for subscribing!"); if that is switched on in
  // Mailchimp the message becomes "Almost finished..." with no change here.
  if (parsed.result === 'success') {
    return { status: 'subscribed', message: message || 'Thank you for subscribing.' };
  }

  if (isAlreadySubscribed(message)) {
    return { status: 'already', message: 'That address is already on the mailing list.' };
  }

  return {
    status: 'invalid',
    message: message || 'That address could not be added. Please check it and try again.',
  };
}
