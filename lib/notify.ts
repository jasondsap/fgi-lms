// =============================================================================
// Email notifications via Resend (Jason, 8-31-26). SERVER-ONLY.
// =============================================================================
//
// Plain fetch against the Resend REST API — no SDK dependency. Configured by
// RESEND_API_KEY + RESEND_FROM_EMAIL (in .env.local and Vercel); silently a
// no-op when they're absent so local/dev environments without keys still work.
//
// Every send is best-effort: callers must never let a mail failure break the
// user action it decorates (a lost email is recoverable in-app; a lost ticket
// is not).

/** Who hears about new support tickets. Code-as-config for now (Jason 8-31:
    "email Jennifer and I for now") — move to an env list when the LC@ team
    takes over the queue. */
export const TICKET_NOTIFY_TO = ['jason@made180.com', 'jwhite@fletchergroup.org'];

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fgilearn.org';

export const emailEnabled = Boolean(
  process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL,
);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Low-level send. Returns true on success; logs and returns false otherwise. */
export async function sendEmail(input: {
  to: string[];
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!emailEnabled) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      console.error('[notify] resend refused:', res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[notify] send failed:', err);
    return false;
  }
}

/** New-ticket alert to the queue owners. Best-effort — callers don't check. */
export async function notifyNewTicket(input: {
  ticketId: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  submitterName: string | null;
  submitterEmail: string | null;
}): Promise<void> {
  const link = `${BASE_URL}/support/${input.ticketId}`;
  const from = [input.submitterName, input.submitterEmail && `(${input.submitterEmail})`]
    .filter(Boolean).join(' ') || 'a signed-in user';
  const excerpt = input.description.length > 600
    ? `${input.description.slice(0, 600)}…`
    : input.description;

  await sendEmail({
    to: TICKET_NOTIFY_TO,
    subject: `[LRC Support] ${input.title}`,
    html: `
      <div style="font-family: 'Open Sans', Arial, sans-serif; color: #1d2b38; line-height: 1.6; max-width: 560px;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #5f6e7c;">
          New support ticket &middot; ${esc(input.category)} &middot; ${esc(input.priority)} priority
        </p>
        <h2 style="margin: 0 0 10px; font-size: 19px; color: #163d5b;">${esc(input.title)}</h2>
        <p style="margin: 0 0 14px; font-size: 14px;">From ${esc(from)}</p>
        <blockquote style="margin: 0 0 18px; padding: 10px 14px; border-left: 3px solid #0e72a2; background: #f4f8fb; font-size: 14px; white-space: pre-wrap;">${esc(excerpt)}</blockquote>
        <p style="margin: 0;">
          <a href="${link}" style="background: #0e72a2; color: #ffffff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Open the ticket</a>
        </p>
        <p style="margin: 16px 0 0; font-size: 12px; color: #5f6e7c;">
          Fletcher Group Learning Resource Center &middot; <a href="${BASE_URL}/admin/support" style="color: #0e72a2;">support queue</a>
        </p>
      </div>`,
  });
}
