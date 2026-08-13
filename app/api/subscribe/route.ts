// POST /api/subscribe — mailing list signup from the header modal.
//
// Exists because list-manage.com sends no CORS headers, so the browser can post
// to it but never read the reply. The call is made from here instead, which is
// what lets the visitor stay on the site and see a real result (lib/mailchimp.ts).
//
// Anonymous by design, like /api/evaluations: the mailing list is the one thing
// on the site aimed squarely at people who do not have an account yet.
import { NextRequest, NextResponse } from 'next/server';
import { HONEYPOT_FIELD, MailchimpError, subscribe } from '@/lib/mailchimp';

export const dynamic = 'force-dynamic';

/**
 * Deliberately loose. Address validity is Mailchimp's judgement to make and it
 * returns a usable message when it objects; this only rejects what is plainly
 * not an address, so the third-party call is not made for empty input.
 */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

/**
 * Crude per-IP throttle.
 *
 * Hosting this form ourselves means losing whatever bot protection sat on
 * Mailchimp's own page, and this audience is single opt-in — an address that
 * reaches Mailchimp is on the list, with no confirmation click in the way. That
 * makes an open endpoint worth slowing down.
 *
 * Honest about what it is: memory is per serverless instance and resets on cold
 * start, so this blunts a naive script and nothing more. A determined attacker
 * needs a real store or a captcha in front of the form.
 */
function overLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);

  if (recent.size > 5000) {
    for (const [key, times] of recent) {
      if (times.every((t) => now - t >= WINDOW_MS)) recent.delete(key);
    }
  }
  return hits.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  // x-real-ip is the fallback: Vercel sets both, but only the second survives
  // some proxy paths, and local dev sets neither.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
  if (overLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again in a few minutes.' },
      { status: 429 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'We could not read that request.' }, { status: 400 });
  }

  // Honeypot. A bot that fills every field gets the same 200 a person does, so
  // it has nothing to retry against — but nothing is sent to Mailchimp.
  if (typeof payload[HONEYPOT_FIELD] === 'string' && payload[HONEYPOT_FIELD] !== '') {
    return NextResponse.json({ status: 'subscribed', message: 'Thanks for subscribing.' });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!LOOKS_LIKE_EMAIL.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 },
    );
  }

  // Both names are enforced here rather than by Mailchimp, where the merge
  // fields are optional — it would happily store a contact with neither.
  const firstName = typeof payload.first_name === 'string' ? payload.first_name.trim() : '';
  const lastName  = typeof payload.last_name  === 'string' ? payload.last_name.trim()  : '';
  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: 'Please enter your first and last name.' },
      { status: 400 },
    );
  }
  if (firstName.length > 80 || lastName.length > 80) {
    return NextResponse.json(
      { error: 'That name is longer than we can store.' },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await subscribe({ email, firstName, lastName }));
  } catch (error) {
    // The address is never logged — it is the whole of the personal data here.
    console.error('Mailchimp subscribe failed:',
      error instanceof MailchimpError ? error.message : error);
    return NextResponse.json(
      { error: 'The mailing list is not responding right now. Please try again shortly.' },
      { status: 502 },
    );
  }
}
