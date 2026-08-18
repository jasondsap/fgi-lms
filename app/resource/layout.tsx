import Header from '@/components/layout/Header';
import ShellFooter from '@/components/layout/ShellFooter';

// Resource detail pages get the FGI header and the slim shell footer
// (8-11-26 webinar shell mockup — every detail shell matches its chrome).
export default function ResourceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <ShellFooter />
    </>
  );
}
