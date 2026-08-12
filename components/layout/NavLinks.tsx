'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/*
 * Header navigation. Client-side only because the 8-10-26 mockup marks the
 * current page in gold with a gold underline, which needs the pathname.
 * "Mailing List Sign Up" is a filled pill in the mockup rather than a plain
 * link, so it is rendered separately after the list.
 */
const LINKS = [
  { label: 'Home',         href: '/' },
  { label: 'Library',      href: '/library' },
  { label: 'Fletcher Web', href: 'https://www.fletchergroup.org', external: true },
  { label: 'TA Request',   href: 'https://airtable.com/appDb16SxhhHo4TeX/page3ondJkFAWb73q/form', external: true },
];

const MAILING_LIST =
  'https://fletchergroup.us10.list-manage.com/subscribe?u=920c4fe7f0dead37ebaa7057b&id=342805a659';

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" style={{ marginLeft: 'auto' }}>
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

        <li>
          <Link
            href={MAILING_LIST}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'var(--fgi-blue)',
              color: '#ffffff',
              fontSize: '16px',
              textDecoration: 'none',
              padding: '7px 20px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}
          >
            Mailing List Sign Up
          </Link>
        </li>
      </ul>
    </nav>
  );
}
