'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EvaluationForm from '@/components/resource/EvaluationForm';
import { EVALUATION_INTRO, EVALUATION_THANKS } from '@/lib/evaluation-items';

export interface PlayerModule {
  cmid: number;
  name: string;
  modname: string; // 'scorm' | 'quiz' | 'page' | ...
  url: string;
  state: number; // 0 incomplete, 1 complete, 2 complete-pass, 3 complete-fail
  /** Moodle completion tracking: 0 none, 1 manual, 2 automatic. Untracked
      modules (certificates, reference links) stay out of the progress bar. */
  completion: number;
  /** Certificate not yet earned — rendered locked, not clickable. */
  locked?: boolean;
  /** Tooltip for a locked row; defaults to the certificate wording. */
  lockTitle?: string;
}

/**
 * One collapsible block in the sidebar. Either headed by a lesson (`lead`, and
 * clicking the header opens it) or by a static `label` — the Evaluation block
 * and the loose-resources block have no lesson of their own.
 */
export interface PlayerGroup {
  key: string;
  kind: 'lesson' | 'evaluation' | 'resources' | 'certificate';
  lead: PlayerModule | null;
  label: string | null;
  items: PlayerModule[];
}

export interface PlayerSection {
  id: number;
  name: string;
  groups: PlayerGroup[];
}

interface Props {
  title: string;
  slug: string;
  /** '' on FGI, '/colorado' or '/scarr' on a tenant portal. */
  basePath: string;
  /** Site evaluation (8-30-26): clicking the evaluation activity renders the
      Learning Center survey in the pane instead of Moodle's feedback UI. */
  siteEvaluation?: boolean;
  /** 'fgi' | tenant slug — stored with the evaluation response. */
  surfaceKey?: string;
  /** Surface accent for the survey controls. */
  accent?: string;
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
  customcert: 'Certificate',
};

const groupModules = (g: PlayerGroup): PlayerModule[] =>
  g.lead ? [g.lead, ...g.items] : g.items;

export default function CoursePlayer({
  title, slug, basePath, sections, initialSrc, initialCmid,
  siteEvaluation = false, surfaceKey = 'fgi', accent = 'var(--fgi-blue)',
}: Props) {
  const router = useRouter();
  // iframe src lives in state so server refreshes (which mint a new one-time
  // login URL) never reload the running activity
  const [iframeSrc, setIframeSrc] = useState(initialSrc);
  const [activeCmid, setActiveCmid] = useState(initialCmid);
  // Collapsed groups only — everything starts expanded, so a group added by a
  // later course edit is visible rather than silently folded away.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Site evaluation pane state: showing it, and submitted-this-session.
  const [showEval, setShowEval] = useState(false);
  const [evalDone, setEvalDone] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const allGroups = sections.flatMap((s) => s.groups);
  const allModules = allGroups.flatMap(groupModules);
  // Only completion-tracked modules count toward progress — a certificate or
  // reference link with no tracking would otherwise hold the bar under 100%.
  const trackedModules = allModules.filter((m) => m.completion > 0);
  const completed = trackedModules.filter((m) => m.state === 1 || m.state === 2).length;
  const pct = trackedModules.length ? Math.round((completed / trackedModules.length) * 100) : 0;

  // A single-activity course gets no headers — wrapping one item in a
  // collapsible block is pure noise.
  const flat = allModules.length <= 1;
  // Moodle's default section name ("General") means nothing to a learner; only
  // show section names when there is genuinely more than one section.
  const showSectionNames = sections.length > 1;

  // Completion states change inside the iframe (Moodle-side); re-run the
  // server component periodically so the sidebar checkmarks catch up.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);

  const isSiteEval = (m: PlayerModule) =>
    siteEvaluation && (m.modname === 'feedback' || m.modname === 'questionnaire');

  const openModule = (m: PlayerModule) => {
    setActiveCmid(m.cmid);
    if (isSiteEval(m)) {
      // The Learning Center survey renders in the pane — Moodle's feedback
      // UI is never shown (Jennifer, 8-30).
      setShowEval(true);
      return;
    }
    setShowEval(false);
    // The Moodle session cookie was established by the initial SSO load —
    // plain activity URLs work from here on.
    setIframeSrc(m.url);
  };

  const StatusCircle = ({ done, small }: { done: boolean; small?: boolean }) => (
    <span style={{
      width: small ? '16px' : '22px',
      height: small ? '16px' : '22px',
      borderRadius: '50%',
      flexShrink: 0,
      border: done ? 'none' : `2px solid ${small ? '#d4d4d4' : '#c4c4c4'}`,
      background: done ? 'var(--fgi-blue)' : 'transparent',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: small ? '10px' : '13px',
      fontWeight: 700,
    }}>
      {done ? '✓' : ''}
    </span>
  );

  /** A lesson / evaluation row. `nested` rows are the indented attachments. */
  const ModuleRow = ({ m, nested }: { m: PlayerModule; nested?: boolean }) => {
    const isActive = m.cmid === activeCmid;
    const isDone = m.state === 1 || m.state === 2;
    const locked = !!m.locked;
    return (
      <button
        onClick={locked ? undefined : () => openModule(m)}
        disabled={locked}
        title={locked ? (m.lockTitle ?? 'Complete every item above to unlock your certificate') : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: nested ? '10px' : '12px',
          width: '100%', textAlign: 'left',
          padding: nested ? '8px 20px 8px 0' : '11px 20px',
          background: isActive ? 'var(--fgi-blue-light)' : 'transparent',
          border: 'none',
          borderLeft: isActive && !nested ? '3px solid var(--fgi-blue)' : '3px solid transparent',
          cursor: locked ? 'default' : 'pointer',
          opacity: locked ? 0.55 : 1,
          fontFamily: 'inherit',
        }}
      >
        {locked ? (
          <span aria-hidden style={{
            width: nested ? '16px' : '22px', height: nested ? '16px' : '22px',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: nested ? '11px' : '14px',
          }}>🔒</span>
        ) : (
          <StatusCircle done={isDone} small={nested} />
        )}
        <span>
          <span style={{
            display: 'block',
            fontSize: nested ? '13px' : '14px',
            fontWeight: isActive ? 700 : nested ? 400 : 500,
            color: nested ? 'var(--text-body-dark, #333)' : 'var(--text-primary)',
            lineHeight: 1.35,
          }}>
            {m.name}
          </span>
          <span style={{
            display: 'block', fontSize: '11px', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px',
          }}>
            {MODNAME_LABELS[m.modname] ?? m.modname}
            {m.state === 3 ? ' · not yet passed' : ''}
            {locked ? ` · ${(m.lockTitle ?? 'Complete all items to unlock').toLowerCase()}` : ''}
          </span>
        </span>
      </button>
    );
  };

  const Group = ({ g }: { g: PlayerGroup }) => {
    const members = groupModules(g);
    const done = members.filter((m) => m.state === 1 || m.state === 2).length;
    const isCollapsed = !!collapsed[g.key];
    const canCollapse = g.items.length > 0;
    const toggle = () => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }));

    return (
      <div style={{ marginBottom: '2px' }}>
        {/* Header — the lesson itself when there is one, else a static label */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {g.lead ? (
              <ModuleRow m={g.lead} />
            ) : (
              <div style={{
                padding: '12px 20px 6px',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
              }}>
                {g.label}
              </div>
            )}
          </div>
          {canCollapse && (
            <button
              onClick={toggle}
              aria-expanded={!isCollapsed}
              aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${g.lead?.name ?? g.label ?? 'section'}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0 16px 0 4px', background: 'transparent', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0,
              }}
            >
              <span>{done}/{members.length}</span>
              <span style={{
                display: 'inline-block',
                transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                transition: 'transform 0.15s',
                fontSize: '10px',
              }}>▾</span>
            </button>
          )}
        </div>

        {/* Indented attachments, hung off a connector line */}
        {!isCollapsed && g.items.length > 0 && (
          <div style={{
            marginLeft: '31px',
            paddingLeft: '14px',
            borderLeft: '1px solid var(--border-color)',
          }}>
            {g.items.map((m) => <ModuleRow key={m.cmid} m={m} nested />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="course-player" style={{ background: 'var(--body-bg)' }}>
      {/* ── Sidebar (phones: a scrollable band above the activity — globals.css) ── */}
      <aside className="course-sidebar" style={{
        background: '#ffffff',
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

        {/* Lessons, their resources, and the evaluation */}
        <nav style={{ flex: 1, padding: '10px 0' }}>
          {sections.map((section) => (
            <div key={section.id} style={{ marginBottom: '6px' }}>
              {showSectionNames && section.name && (
                <div style={{
                  padding: '10px 20px 6px',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: 'var(--text-muted)',
                }}>
                  {section.name}
                </div>
              )}
              {flat
                ? section.groups.flatMap(groupModules).map((m) => <ModuleRow key={m.cmid} m={m} />)
                : section.groups.map((g) => <Group key={g.key} g={g} />)}
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
      <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {showEval && (
          <div style={{
            position: 'absolute', inset: 0, overflowY: 'auto',
            background: '#ffffff', zIndex: 5,
          }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Course Evaluation
              </h2>
              {(evalDone || allModules.some((m) => m.cmid === activeCmid && (m.state === 1 || m.state === 2))) ? (
                <p style={{ fontSize: '16px', fontWeight: 600, marginTop: '1rem' }}>
                  {EVALUATION_THANKS}
                </p>
              ) : (
                <>
                  {EVALUATION_INTRO.map((line, i) => (
                    <p key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.5 }}>
                      {line}
                    </p>
                  ))}
                  <div style={{ marginTop: '1.25rem' }}>
                    <EvaluationForm
                      slug={slug}
                      surface={surfaceKey}
                      accent={accent}
                      moodleCmid={activeCmid}
                      onDone={() => { setEvalDone(true); router.refresh(); }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
