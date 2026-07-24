import Header from '@/components/layout/Header';

// Resource detail pages get the FGI header but no footer (per the layout notes).
export default function ResourceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
