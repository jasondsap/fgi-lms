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
import { STATE_PORTALS, type StatePortal } from '@/lib/state-portals';

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

/**
 * Welcome email, one per surface (Jennifer's "registration pop-ups and welcome
 * emails 9-4-26" doc). Sent to every new registration by registerAction; the
 * portal versions double as the "here is your link" note for people who
 * registered on fgilearn.org and chose their state portal instead.
 */
export type WelcomeSurface = 'fgi' | 'scarr' | 'colorado';

interface WelcomeCopy {
  subject: string;
  /** "We're excited you joined ..." — the sentence before the tips. */
  joined: string;
  /** Human-readable direct link (no scheme) and its href. */
  link: string;
  href: string;
  /** Tips under "Navigate Your Resources", in order. Plain text; quotes are fine. */
  tips: string[];
  /** Label of the support button as it reads on that surface. */
  contactLabel: string;
}

const COMMON_TIPS = [
  'Use filters or keyword search to quickly find what you need',
  'Ask Fletch for personalized guidance on any topic',
  'Track and manage all your resources in your profile circle (top right)',
];

function portalWelcomeCopy(portal: StatePortal): WelcomeCopy {
  return {
    subject: `Welcome to ${portal.stateName === 'Colorado' ? 'Colorado' : portal.partner}’s Learning Resource Center!`,
    joined: `We're excited you joined the ${portal.partnerLong} (${portal.partner}) LRC.`,
    link: portal.link,
    href: `${BASE_URL}/${portal.slug}`,
    tips: [
      `Browse state-specific certification information and curated resources tailored for ${portal.stateName}`,
      'Access the full Fletcher Group LRC library using the "Other Libraries" filter',
      ...COMMON_TIPS,
    ],
    contactLabel: 'Contact',
  };
}

function welcomeCopyFor(surface: WelcomeSurface): WelcomeCopy {
  switch (surface) {
    case 'scarr':    return portalWelcomeCopy(STATE_PORTALS.SC);
    case 'colorado': return portalWelcomeCopy(STATE_PORTALS.CO);
    default:
      return {
        subject: 'Welcome to Fletcher Group’s Learning Resource Center!',
        joined: "We're excited you joined.",
        link: 'fgilearn.org',
        href: BASE_URL,
        tips: COMMON_TIPS,
        contactLabel: 'Contact Us',
      };
  }
}

/** Renders the welcome email body. Exported for previewing (scripts/preview-welcome-emails.js). */
export function welcomeEmail(input: {
  firstName: string;
  surface: WelcomeSurface;
  /** True when the person registered on fgilearn.org and chose the state portal. */
  switchedToPortal?: boolean;
}): { subject: string; html: string } {
  const c = welcomeCopyFor(input.surface);
  const h3 = 'margin: 18px 0 6px; font-size: 15px; color: #163d5b;';
  const p = 'margin: 0 0 12px; font-size: 14px;';
  const tips = c.tips.map((t) => `<li style="margin: 0 0 6px;">${esc(t)}</li>`).join('');
  const switched = input.switchedToPortal
    ? `<p style="${p} color: #5f6e7c;">You registered on fgilearn.org and chose your state portal &mdash; same email, same password, just use this link from now on.</p>`
    : '';
  return {
    subject: c.subject,
    html: `
    <div style="font-family: 'Open Sans', Arial, sans-serif; color: #1d2b38; line-height: 1.6; max-width: 560px;">
      <p style="${p}">Hi ${esc(input.firstName)},</p>
      <h2 style="margin: 0 0 10px; font-size: 19px; color: #163d5b;">Welcome!</h2>
      <p style="${p}">${esc(c.joined)} Here are a few tips to get you started:</p>

      <h3 style="${h3}">Your Direct Link</h3>
      <p style="${p}">Be sure to bookmark this link for easy access:
        <a href="${c.href}" style="color: #0e72a2; font-weight: 600;">${esc(c.link)}</a></p>
      ${switched}

      <h3 style="${h3}">Navigate Your Resources</h3>
      <ul style="margin: 0 0 12px; padding-left: 20px; font-size: 14px;">
        ${tips}
      </ul>

      <h3 style="${h3}">Need Help?</h3>
      <p style="${p}">If you have questions or run into any issues, click the &ldquo;${esc(c.contactLabel)}&rdquo; button.
        Our support team is here to help. If you&rsquo;re not in the LRC and need support, email
        <a href="mailto:LC@fletchergroup.org" style="color: #0e72a2;">LC@fletchergroup.org</a>.</p>

      <p style="margin: 18px 0 0; font-size: 14px; font-weight: 600;">Happy Learning &amp; Exploring</p>
      <p style="margin: 16px 0 0; font-size: 12px; color: #5f6e7c;">
        Fletcher Group Learning Resource Center &middot; Learning Center Support &middot; LC@fletchergroup.org
      </p>
    </div>`,
  };
}

/** Send the welcome email for the surface the account registered on. Best-effort. */
export async function notifyWelcome(input: {
  toEmail: string;
  firstName: string;
  surface: WelcomeSurface;
  switchedToPortal?: boolean;
}): Promise<void> {
  const { subject, html } = welcomeEmail(input);
  await sendEmail({ to: [input.toEmail], subject, html });
}

/** The submitter's ticket URL: their portal chrome if they live on one. */
function ticketLinkFor(ticketId: string, surface: string | null | undefined): string {
  const base = surface && surface !== 'fgi' ? `${BASE_URL}/${surface}` : BASE_URL;
  return `${base}/support/${ticketId}`;
}

/** Shared frame for submitter-facing ticket emails. */
function ticketEmailHtml(input: {
  kicker: string;
  title: string;
  intro: string;
  quote: string | null;
  link: string;
}): string {
  const quoteHtml = input.quote
    ? `<blockquote style="margin: 0 0 18px; padding: 10px 14px; border-left: 3px solid #0e72a2; background: #f4f8fb; font-size: 14px; white-space: pre-wrap;">${esc(input.quote)}</blockquote>`
    : '';
  return `
    <div style="font-family: 'Open Sans', Arial, sans-serif; color: #1d2b38; line-height: 1.6; max-width: 560px;">
      <p style="margin: 0 0 6px; font-size: 13px; color: #5f6e7c;">${esc(input.kicker)}</p>
      <h2 style="margin: 0 0 10px; font-size: 19px; color: #163d5b;">${esc(input.title)}</h2>
      <p style="margin: 0 0 14px; font-size: 14px;">${esc(input.intro)}</p>
      ${quoteHtml}
      <p style="margin: 0;">
        <a href="${input.link}" style="background: #0e72a2; color: #ffffff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">View your ticket</a>
      </p>
      <p style="margin: 16px 0 0; font-size: 12px; color: #5f6e7c;">
        Fletcher Group Learning Resource Center &middot; Learning Center Support
      </p>
    </div>`;
}

/** Tell the submitter Learning Center Support replied to their ticket. */
export async function notifyTicketReply(input: {
  ticketId: string;
  title: string;
  body: string;
  toEmail: string;
  surface: string | null | undefined;
}): Promise<void> {
  const excerpt = input.body.length > 600 ? `${input.body.slice(0, 600)}…` : input.body;
  await sendEmail({
    to: [input.toEmail],
    subject: `[LRC Support] Reply on your ticket: ${input.title}`,
    html: ticketEmailHtml({
      kicker: 'New reply on your support ticket',
      title: input.title,
      intro: 'Learning Center Support replied to your ticket:',
      quote: excerpt,
      link: ticketLinkFor(input.ticketId, input.surface),
    }),
  });
}

/** Tell the submitter their ticket was resolved or closed. */
export async function notifyTicketResolved(input: {
  ticketId: string;
  title: string;
  status: string; // 'resolved' | 'closed'
  resolutionNote: string | null;
  toEmail: string;
  surface: string | null | undefined;
}): Promise<void> {
  const closed = input.status === 'closed';
  await sendEmail({
    to: [input.toEmail],
    subject: `[LRC Support] Your ticket was ${closed ? 'closed' : 'resolved'}: ${input.title}`,
    html: ticketEmailHtml({
      kicker: `Support ticket ${closed ? 'closed' : 'resolved'}`,
      title: input.title,
      intro: closed
        ? 'Learning Center Support has closed your ticket. If you still need help, you can reply on the ticket to reopen the conversation.'
        : 'Learning Center Support has marked your ticket resolved. If this didn’t fix things, reply on the ticket and we’ll take another look.',
      quote: input.resolutionNote,
      link: ticketLinkFor(input.ticketId, input.surface),
    }),
  });
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
