import type { Metadata } from 'next';
import './globals.css';
import RegistrationGate from '@/components/account/RegistrationGate';

// SEO (Jason, 8-31-26: Google was showing random page fragments): the title
// matches how people actually search ("Fletcher Group … Resource Center"),
// the description is the home-page welcome copy, and metadataBase falls back
// to the real domain so canonicals/OG URLs never emit localhost.
export const metadata: Metadata = {
  title: 'Fletcher Group Learning Resource Center',
  description: 'Your one-stop, no-cost library for building stronger recovery housing and support programs — courses, guides, webinars, podcasts, NAADAC CE opportunities, research, and more.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://fgilearn.org'),
  openGraph: {
    siteName: 'Fletcher Group Learning Resource Center',
    type: 'website',
  },
};

// Organization + WebSite structured data — tells Google what this site is
// and its canonical home, site-wide.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Fletcher Group Learning Resource Center',
  alternateName: ['FGI Learning Resource Center', 'Fletcher Group Resource Center'],
  url: 'https://fgilearn.org',
  description: 'Your one-stop, no-cost library for building stronger recovery housing and support programs — courses, guides, webinars, podcasts, NAADAC CE opportunities, research, and more.',
  publisher: {
    '@type': 'Organization',
    name: 'Fletcher Group, Inc.',
    url: 'https://www.fletchergroup.org',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          // Static, server-authored JSON — nothing user-controlled reaches it.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* Header/Footer are provided per route group (FGI surfaces vs tenant
            pages) so tenant landing pages can supply their own chrome. */}
        {children}
        {/* Blocks the site until a signed-in user completes registration */}
        <RegistrationGate />
      </body>
    </html>
  );
}
