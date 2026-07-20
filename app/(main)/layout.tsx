import Footer from '@/components/layout/Footer';

// Footer renders the contact block, the "In Partnership With" strip, and the
// HRSA disclaimer block as one unit (per the 7-18-26 mockup).
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
