import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'FGI Learning Resource Center',
  description: 'Fletcher Group Learning Resource Center — a no-cost national platform supporting the Substance Use Disorder Recovery Ecosystem.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
