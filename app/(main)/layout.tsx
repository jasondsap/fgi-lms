import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// FGI main surfaces (home + library) get the FGI header and the full footer
// (contact block, "In Partnership With" strip, HRSA disclaimer).
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
