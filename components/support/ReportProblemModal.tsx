'use client';

/**
 * Question/problem ticket modal + its launcher button, ported from the DDOR
 * platform (8-31-26) and re-skinned LRC-style. Wording widened same day
 * (Jennifer/Jason): tickets are for questions as well as problems. No
 * attachments in phase 1. Auto-captures the page URL and browser info;
 * submits via the createTicketAction server action; success state links to
 * the ticket and to My Tickets.
 */

import { useState } from 'react';
import Link from 'next/link';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, PRIORITY_LABEL } from '@/lib/support';
import { createTicketAction } from './support-actions';

const FIELD: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '14px', fontFamily: 'inherit',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
  background: '#fff', color: 'var(--text-primary)', boxSizing: 'border-box',
};

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
  marginBottom: '4px',
};

export default function ReportProblemModal({
  open, onClose, basePath = '', accent = 'var(--fgi-blue)',
}: {
  open: boolean;
  onClose: () => void;
  /** '' on FGI, '/scarr' etc. on a tenant — keeps ticket links in-chrome. */
  basePath?: string;
  accent?: string;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [doneId, setDoneId] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setTitle(''); setCategory(''); setPriority('normal'); setDescription('');
    setError(''); setDoneId(null); setSubmitting(false);
  };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    setError('');
    if (!title.trim()) { setError('Please add a short title.'); return; }
    if (!category) { setError('Please choose a category.'); return; }
    if (!description.trim()) { setError('Please add your question or describe what happened.'); return; }

    setSubmitting(true);
    try {
      const result = await createTicketAction({
        title: title.trim(),
        category,
        priority,
        description: description.trim(),
        pageUrl: window.location.href,
        browserInfo: `${navigator.userAgent} ${window.innerWidth}x${window.innerHeight}`,
      });
      if ('error' in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      setDoneId(result.id);
      setSubmitting(false);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 16px 16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={close}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)' }}
      />
      <div
        role="dialog"
        aria-label="Ask a question or report a problem"
        style={{
          position: 'relative', width: 'min(520px, 100%)',
          background: '#fff', borderRadius: 'var(--radius-lg)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        <header style={{
          background: 'var(--fgi-navy)', color: '#fff', padding: '13px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>Ask a Question or Report a Problem</div>
          <button
            onClick={close}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', color: '#fff',
              fontSize: '22px', lineHeight: 1, cursor: 'pointer', padding: '0 4px',
            }}
          >
            ×
          </button>
        </header>

        {doneId ? (
          <div style={{ padding: '28px 24px', textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/fletch/fletch-notes.webp"
              alt=""
              style={{ height: '100px', width: 'auto', margin: '0 auto 10px', display: 'block' }}
            />
            <p style={{ fontWeight: 700, fontSize: '16px', margin: '0 0 4px' }}>
              Ticket submitted — we&#39;ll follow up here.
            </p>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '0 0 18px' }}>
              Learning Center Support reads every ticket. Track its status anytime under My Tickets.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href={`${basePath}/support/${doneId}`}
                onClick={close}
                style={{
                  background: accent, color: '#fff', padding: '9px 18px',
                  borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                View ticket
              </Link>
              <Link
                href={`${basePath}/support`}
                onClick={close}
                style={{
                  background: '#fff', color: 'var(--text-primary)', padding: '9px 18px',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                }}
              >
                My Tickets
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div>
              <label style={LABEL}>Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                placeholder="Short summary of your question or problem"
                style={FIELD}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={LABEL}>Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={FIELD}>
                  <option value="">— Select —</option>
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={LABEL}>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} style={FIELD}>
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={LABEL}>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Ask your question, or tell us what happened — for problems, steps to reproduce help us fix it faster."
                style={{ ...FIELD, resize: 'vertical' }}
              />
            </div>

            {error && (
              <div role="alert" style={{
                fontSize: '13px', color: '#8a1c1c', background: '#fdf0f0',
                border: '1px solid #f2d4d4', borderRadius: 'var(--radius-md)', padding: '9px 12px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={close}
                disabled={submitting}
                style={{
                  background: '#fff', color: 'var(--text-primary)', padding: '9px 18px',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
                  cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.55 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                style={{
                  background: accent, color: '#fff', padding: '9px 20px', border: 'none',
                  borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600,
                  fontFamily: 'inherit', cursor: submitting ? 'default' : 'pointer',
                  opacity: submitting ? 0.55 : 1,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit ticket'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Filled launcher button + the modal it opens. */
export function ReportProblemButton({
  basePath = '', accent = 'var(--fgi-blue)', label = 'Question / Problem',
}: { basePath?: string; accent?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: accent, color: '#fff', padding: '9px 18px', border: 'none',
          borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600,
          fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
      <ReportProblemModal open={open} onClose={() => setOpen(false)} basePath={basePath} accent={accent} />
    </>
  );
}
