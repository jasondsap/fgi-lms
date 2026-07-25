'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface PlayerModule {
  cmid: number;
  name: string;
  modname: string; // 'scorm' | 'quiz' | 'page' | ...
  url: string;
  state: number; // 0 incomplete, 1 complete, 2 complete-pass, 3 complete-fail
}

export interface PlayerSection {
  id: number;
  name: string;
  modules: PlayerModule[];
}

interface Props {
  title: string;
  slug: string;
  /** '' on FGI, '/colorado' or '/scarr' on a tenant portal. */
  basePath: string;
  sections: PlayerSection[];
  initialSrc: string; // one-time SSO login URL → first activity
  initialCmid: number;
}

const MODNAME_LABELS: Record<string, string> = {
  scorm: 'Interactive lesson',
  quiz: 'Evaluation',
  page: 'Lesson',
  videotime: 'Video',
  url: 'Link',
  resource: 'Resource',
};

export default function CoursePlayer({ title, slug, basePath, sections, initialSrc, initialCmid }: Props) {
  const router = useRouter();
  // iframe src lives in state so server refreshes (which mint a new one-time
  // login URL) never reload the running activity
  const [iframeSrc, setIframeSrc] = useState(initialSrc);
  const [activeCmid, setActiveCmid] = useState(initialCmid);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const allModules = sections.flatMap((s) => s.modules);
  const completed = allModules.filter((m) => m.state === 1 || m.state === 2).length;
  const pct = allModules.length ? Math.round((completed / allModules.length) * 100) : 0;

  // Completion states change inside the iframe (Moodle-side); re-run the
  // server component periodically so the sidebar checkmarks catch up.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);

  const openModule = (m: PlayerModule) => {
    setActiveCmid(m.cmid);
    // The Moodle session cookie was established by the initial SSO load —
    // plain activity URLs work from here on.
    setIframeSrc(m.url);
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 80px)', // header is 80px, sticky
      background: 'var(--body-bg)',
    }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: '320px',
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid var(--border-color)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-color)' }}>
          <Link href={`${basePath}/resource/${slug}`} style={{
            fontSize: '13px', color: 'var(--fgi-blue)', textDecoration: 'none', fontWeight: 600,
          }}>
            ‹ Back to course page
          </Link>
          <h1 style={{ fontSize: '19px', fontWeight: 700, lineHeight: 1.3, margin: '10px 0 12px' }}>
            {title}
          </h1>
          {/* Progress */}
          <div style={{
            height: '6px', borderRadius: '3px', background: '#e8e8e8',
            overflow: 'hidden', marginBottom: '6px',
          }}>
            <div style={{
              width: `${pct}%`, height: '100%', background: 'var(--fgi-blue)',
              borderRadius: '3px', transition: 'width 0.4s',
            }} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {pct}% complete · {completed} of {allModules.length}
          </div>
        </div>

        {/* Sections + lessons */}
        <nav style={{ flex: 1, padding: '10px 0' }}>
          {sections.map((section) => (
            <div key={section.id} style={{ marginBottom: '6px' }}>
              {section.name && (
                <div style={{
                  padding: '10px 20px 6px',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: 'var(--text-muted)',
                }}>
                  {section.name}
                </div>
              )}
              {section.modules.map((m) => {
                const isActive = m.cmid === activeCmid;
                const isDone = m.state === 1 || m.state === 2;
                return (
                  <button
                    key={m.cmid}
                    onClick={() => openModule(m)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', textAlign: 'left',
                      padding: '11px 20px',
                      background: isActive ? 'var(--fgi-blue-light)' : 'transparent',
                      border: 'none',
                      borderLeft: isActive ? '3px solid var(--fgi-blue)' : '3px solid transparent',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {/* Status circle */}
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                      border: isDone ? 'none' : '2px solid #c4c4c4',
                      background: isDone ? 'var(--fgi-blue)' : 'transparent',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700,
                    }}>
                      {isDone ? '✓' : ''}
                    </span>
                    <span>
                      <span style={{
                        display: 'block', fontSize: '14px', fontWeight: isActive ? 700 : 500,
                        color: 'var(--text-primary)', lineHeight: 1.35,
                      }}>
                        {m.name}
                      </span>
                      <span style={{
                        display: 'block', fontSize: '11px', color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px',
                      }}>
                        {MODNAME_LABELS[m.modname] ?? m.modname}
                        {m.state === 3 ? ' · not yet passed' : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border-color)',
          fontSize: '12px', color: 'var(--text-muted)',
        }}>
          Progress updates automatically as you complete lessons.
        </div>
      </aside>

      {/* ── Activity pane ── */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title={title}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
          allow="fullscreen; autoplay"
          allowFullScreen
        />
      </main>
    </div>
  );
}
