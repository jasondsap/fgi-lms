'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MailingListModal from './MailingListModal';

/*
 * Header navigation. Client-side only because the 8-10-26 mockup marks the
 * current page in gold with a gold underline, which needs the pathname.
 * "Mailing List Sign Up" is a filled pill in the mockup rather than a plain
 * link, so it is rendered separately after the list — and since 8-13-26 it
 * opens the signup in a modal instead of sending the visitor to Mailchimp.
 */
/** Mailing List Sign Up pill in the header — off for now (Jason, 8-30-26). */
const SHOW_MAILING_LIST = false;

const LINKS = [
  { label: 'Home',         href: '/' },
  { label: 'Library',      href: '/library' },
  { label: 'Fletcher Web', href: 'https://www.fletchergroup.org', external: true },
  { label: 'Consultation Request', href: 'https://airtable.com/appDb16SxhhHo4TeX/page3ondJkFAWb73q/form', external: true },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    // Links sit next to the logo; the account control alone goes to the far right (Jason, 8-30).
    <nav aria-label="Main navigation" style={{ marginLeft: '3rem' }}>
      <ul style={{
        display: 'flex',
        gap: '2.25rem',
        listStyle: 'none',
        alignItems: 'center',
        margin: 0,
        padding: 0,
      }}>
        {LINKS.map(({ label, href, external }) => {
          const active = !external && pathname === href;
          return (
            <li key={label}>
              <Link
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                aria-current={active ? 'page' : undefined}
                style={{
                  color: active ? 'var(--fgi-gold)' : 'rgba(255,255,255,0.92)',
                  fontSize: '16px',
                  fontWeight: 400,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  paddingBottom: '5px',
                  borderBottom: `2px solid ${active ? 'var(--fgi-gold)' : 'transparent'}`,
                }}
              >
                {label}
              </Link>
            </li>
          );
        })}

        {/* Mailing List Sign Up hidden for now (Jason, 8-30) — flip SHOW_MAILING_LIST to bring it back. */}
        {SHOW_MAILING_LIST && (
          <li>
            <MailingListModal />
          </li>
        )}
      </ul>
    </nav>
  );
}
