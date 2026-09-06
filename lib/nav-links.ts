/**
 * FGI header links — shared by the desktop nav (NavLinks, client) and the
 * phone menu rendered from the server Header. Lives outside both because a
 * 'use client' module can only export components to the server side.
 */
export const NAV_LINKS = [
  { label: 'Home',         href: '/' },
  { label: 'Library',      href: '/library' },
  { label: 'Fletcher Web', href: 'https://www.fletchergroup.org', external: true },
  { label: 'Consultation Request', href: 'https://airtable.com/appDb16SxhhHo4TeX/page3ondJkFAWb73q/form', external: true },
];
