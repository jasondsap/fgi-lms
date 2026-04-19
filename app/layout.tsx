import type { Metadata } from 'next';
import './globals.css';
import Header   from '@/components/layout/Header';
import Partners from '@/components/layout/Partners';
import Footer   from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'FGI Educational Resource Center',
  description: 'Fletcher Group Educational Resource Center — a no-cost national platform supporting the Substance Use Disorder Recovery Ecosystem.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Partners />
        <Footer />
      </body>
    </html>
  );
}
