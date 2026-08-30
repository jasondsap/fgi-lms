'use client';
import { useState } from 'react';
import {
  CONTACT_ITEM, RATING_ITEMS, TEXT_ITEMS,
  type RatingKey, type TextKey,
} from '@/lib/evaluation-items';

/**
 * The Learning Center evaluation form — the nine questions, validation and
 * the POST to /api/evaluations. Extracted from FeedbackModal (8-30-26) so the
 * course player can run the very same survey in place of Moodle's feedback
 * UI: pass `moodleCmid` and the server also marks that activity complete for
 * the signed-in learner (one instrument, one dataset — Neon).
 */
const SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const QUESTION = {
  fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px',
};

const TEXTAREA = {
  width: '100%', padding: '9px 11px', fontSize: '14px', fontFamily: 'inherit',
  color: 'var(--text-primary)', background: '#ffffff',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
  resize: 'vertical' as const, minHeight: '72px',
};

export default function EvaluationForm({
  slug,
  surface,
  accent,
  moodleCmid,
  onDone,
  onCancel,
}: {
  slug: string;
  surface: string;
  accent: string;
  /** Course player only: the Moodle evaluation activity to mark complete. */
  moodleCmid?: number;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [ratings, setRatings]   = useState<Partial<Record<RatingKey, number>>>({});
  const [texts, setTexts]       = useState<Partial<Record<TextKey, string>>>({});
  const [mayContact, setMayContact] = useState<boolean | null>(null);
  const [email, setEmail]       = useState('');
  const [missing, setMissing]   = useState<string[]>([]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const unanswered = [
      ...RATING_ITEMS.filter(i => ratings[i.key] === undefined).map(i => i.key as string),
      ...(mayContact === null ? [CONTACT_ITEM.key] : []),
    ];
    setMissing(unanswered);
    if (unanswered.length > 0) {
      setError('Please answer the required questions.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, surface, ratings, texts,
          may_contact: mayContact,
          contact_email: mayContact ? email : null,
          ...(moodleCmid ? { moodle_cmid: moodleCmid } : {}),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Your feedback could not be saved.');
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your feedback could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {/* 0-10 scales */}
      {RATING_ITEMS.map((item) => (
        <fieldset key={item.key} style={{ border: 'none', marginBottom: '1.5rem' }}>
          <legend style={QUESTION}>
            {item.prompt}
            <span style={{ color: '#b13f08' }}> *</span>
          </legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SCALE.map((value) => {
              const selected = ratings[item.key] === value;
              return (
                <label
                  key={value}
                  style={{
                    width: '38px', height: '38px', borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: selected ? 700 : 400,
                    cursor: 'pointer',
                    background: selected ? accent : '#ffffff',
                    color: selected ? '#ffffff' : 'var(--text-primary)',
                    border: `1px solid ${selected ? accent : 'var(--border-color)'}`,
                  }}
                >
                  <input
                    type="radio"
                    name={item.key}
                    value={value}
                    checked={selected}
                    onChange={() => {
                      setMissing(m => m.filter(k => k !== item.key));
                      setRatings(r => ({ ...r, [item.key]: value }));
                    }}
                    className="sr-only"
                  />
                  {value}
                </label>
              );
            })}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px',
            maxWidth: '484px',
          }}>
            <span>Not at all</span>
            <span>Completely</span>
          </div>
          {missing.includes(item.key) && (
            <div style={{ fontSize: '12px', color: '#b13f08', marginTop: '4px' }}>
              Please choose a number.
            </div>
          )}
        </fieldset>
      ))}

      {/* Open ended */}
      {TEXT_ITEMS.map((item) => (
        <div key={item.key} style={{ marginBottom: '1.25rem' }}>
          <label htmlFor={`eval-${item.key}`} style={{ ...QUESTION, display: 'block' }}>
            {item.prompt}
          </label>
          <textarea
            id={`eval-${item.key}`}
            style={TEXTAREA}
            maxLength={2000}
            value={texts[item.key] ?? ''}
            onChange={(e) => setTexts(t => ({ ...t, [item.key]: e.target.value }))}
          />
        </div>
      ))}

      {/* Yes / No */}
      <fieldset style={{ border: 'none', marginBottom: '1.25rem' }}>
        <legend style={QUESTION}>
          {CONTACT_ITEM.prompt}
          <span style={{ color: '#b13f08' }}> *</span>
        </legend>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map((choice) => {
            const selected = mayContact === choice.value;
            return (
              <label
                key={choice.label}
                style={{
                  padding: '8px 24px', borderRadius: '999px', cursor: 'pointer',
                  fontSize: '14px', fontWeight: selected ? 700 : 400,
                  background: selected ? accent : '#ffffff',
                  color: selected ? '#ffffff' : 'var(--text-primary)',
                  border: `1px solid ${selected ? accent : 'var(--border-color)'}`,
                }}
              >
                <input
                  type="radio"
                  name={CONTACT_ITEM.key}
                  checked={selected}
                  onChange={() => {
                    setMissing(m => m.filter(k => k !== CONTACT_ITEM.key));
                    setMayContact(choice.value);
                  }}
                  className="sr-only"
                />
                {choice.label}
              </label>
            );
          })}
        </div>
        {missing.includes(CONTACT_ITEM.key) && (
          <div style={{ fontSize: '12px', color: '#b13f08', marginTop: '4px' }}>
            Please choose Yes or No.
          </div>
        )}
      </fieldset>

      {/* Only asked when they've said yes — an anonymous visitor who agrees
          to contact has given us no way to do it otherwise. */}
      {mayContact === true && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="eval-email" style={{ ...QUESTION, display: 'block' }}>
            Your email address
          </label>
          <input
            id="eval-email" type="email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ ...TEXTAREA, minHeight: 0, resize: 'none' }}
          />
        </div>
      )}

      {error && (
        <div style={{ fontSize: '13px', color: '#b13f08', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: accent, color: '#ffffff', border: 'none',
            padding: '12px 32px', borderRadius: '999px',
            fontWeight: 700, fontSize: '15px', fontFamily: 'inherit',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Sending…' : 'Submit Feedback'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', fontFamily: 'inherit',
              fontSize: '14px', color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
