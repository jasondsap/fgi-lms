import Header from '@/components/layout/Header';
import ShellFooter from '@/components/layout/ShellFooter';

// Course player pages keep the FGI header for navigation, plus the slim
// shell footer so the chrome matches top and bottom (8-11-26 mockup).
export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <ShellFooter />
    </>
  );
}
