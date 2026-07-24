import Header from '@/components/layout/Header';

// Course player pages keep the FGI header for navigation, no footer.
export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
