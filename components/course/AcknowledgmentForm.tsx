'use client';
import { useState } from 'react';
import type { CourseAcknowledgment } from '@/lib/acknowledgment-items';

/**
 * The in-player acknowledgment pane (10-18-26): the statements, an
 * I Agree / I Do Not Agree choice for each, the "N of 4" counter and one
 * Continue button that stays disabled until every statement is agreed. There
 * is no fail state and no score — a "do not agree" simply cannot proceed, and
 * nothing is stored until all four are agreed (Jason). POSTs to
 * /api/acknowledgments, which records the agreement and completes the Moodle
 * activity for the signed-in learner.
 */
export default function AcknowledgmentForm({
  ack, slug, surface, accent, initialAgreed = false, onDone,
}: {
  ack: CourseAcknowledgment;
  slug: string;
  surface: string;
  accent: string;
  /** Start with every statement agreed — the learner already agreed once and
      only the Moodle completion mark is outstanding. */
  initialAgreed?: boolean;
  onDone: () => void;
}) {
  // true = agree, false = do not agree, undefined = not yet answered
  const [answers, setAnswers] = useState<Record<string, boolean | undefined>>(
    () => (initialAgreed ? Object.fromEntries(ack.statements.map((s) => [s.key, true])) : {}),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = ack.statements.length;
  const agreedKeys = ack.statements.map((s) => s.key).filter((k) => answers[k] === true);
  const agreed = agreedKeys.length;
  const anyDisagree = ack.statements.some((s) => answers[s.key] === false);
  const complete = agreed === total;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complete || saving) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch('/api/acknowledgments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, surface, moodle_cmid: ack.cmid, agreed: agreedKeys }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Your acknowledgment could not be saved.');
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your acknowledgment could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const Choice = ({ statementKey, value, label }: { statementKey: string; value: boolean; label: string }) => {
    const selected = answers[statementKey] === value;
    return (
      <label
        style={{
          padding: '8px 20px', borderRadius: '999px', cursor: 'pointer',
          fontSize: '14px', fontWeight: selected ? 700 : 400,
          background: selected ? accent : '#ffffff',
          color: selected ? '#ffffff' : 'var(--text-primary)',
          border: `1px solid ${selected ? accent : 'var(--border-color)'}`,
          whiteSpace: 'nowrap',
        }}
      >
        <input
          type="radio"
          name={`ack-${statementKey}`}
          checked={selected}
          onChange={() => setAnswers((a) => ({ ...a, [statementKey]: value }))}
          className="sr-only"
        />
        {label}
      </label>
    );
  };

  return (
    <form onSubmit={submit}>
      {ack.statements.map((s, i) => {
        const answer = answers[s.key];
        return (
          <fieldset
            key={s.key}
            style={{
              border: `1px solid ${answer === true ? accent : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-md, 10px)',
              padding: '16px 18px', marginBottom: '14px',
              background: answer === true ? 'var(--fgi-blue-light, #eef6fb)' : '#ffffff',
            }}
          >
            <legend style={{
              padding: '0 6px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>
              Statement {i + 1} of {total}
            </legend>
            <p style={{ fontSize: '15px', lineHeight: 1.55, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              {s.text}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Choice statementKey={s.key} value={true} label={ack.agreeLabel} />
              <Choice statementKey={s.key} value={false} label={ack.disagreeLabel} />
            </div>
          </fieldset>
        );
      })}

      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
          padding: '14px 16px', borderRadius: 'var(--radius-md, 10px)',
          background: complete ? 'var(--fgi-blue-light, #eef6fb)' : 'var(--body-bg, #f5f7f9)',
          marginBottom: '14px',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Acknowledgments completed: {agreed} of {total}
          </div>
          {!complete && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {ack.requirement}
            </div>
          )}
        </div>
        <div style={{
          height: '6px', flexBasis: '100%', borderRadius: '3px', background: '#e1e6ea', overflow: 'hidden',
        }}>
          <div style={{
            width: `${(agreed / total) * 100}%`, height: '100%', background: accent,
            borderRadius: '3px', transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {anyDisagree && (
        <p style={{
          fontSize: '14px', lineHeight: 1.5, color: '#7a3b00', background: '#fff6e8',
          border: '1px solid #f3d7ae', borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          margin: '0 0 14px',
        }}>
          {ack.disagreeNote}
        </p>
      )}

      {error && (
        <p role="alert" style={{ fontSize: '14px', color: '#b13f08', margin: '0 0 12px' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={!complete || saving}
        style={{
          background: complete ? accent : '#c9d1d8', color: '#ffffff', border: 'none',
          borderRadius: '999px', padding: '11px 32px', fontSize: '15px', fontWeight: 600,
          cursor: complete && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}
      >
        {saving ? 'Saving…' : ack.submitLabel}
      </button>
    </form>
  );
}
