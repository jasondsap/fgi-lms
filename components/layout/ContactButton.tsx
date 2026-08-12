/*
 * "Contact Us" pill with the paper-plane glyph, from the 8-10-26 mockup. It
 * appears twice — in the grey support bar under the hero and in the navy
 * footer block — so it lives here rather than being written out twice.
 */
export default function ContactButton({
  href = 'mailto:LC@fletchergroup.org',
  label = 'Contact Us',
  fontSize = '17px',
}: { href?: string; label?: string; fontSize?: string } = {}) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        background: 'var(--fgi-blue)',
        color: '#ffffff',
        fontSize,
        fontWeight: 400,
        textDecoration: 'none',
        padding: '9px 22px',
        borderRadius: '999px',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M2.5 11.1 20.6 3.3c.8-.3 1.5.4 1.2 1.2l-7.8 18.1c-.3.8-1.5.8-1.7-.1l-1.9-7-7-1.9c-.9-.2-.9-1.4-.1-1.7z" />
      </svg>
      {label}
    </a>
  );
}
