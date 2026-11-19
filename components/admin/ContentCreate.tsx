'use client';
// "Add a newsletter" / "Add a podcast episode" on /admin/content. Creating
// only makes an unpublished draft and opens its editor — the month/year (or
// episode number) asked for here fixes the item's web address, which is why
// it is asked first and can't be changed afterwards.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createContentAction } from '@/components/admin/content-actions';
import { MONTHS } from '@/lib/admin-content-shared';

const input: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: '14px', padding: '8px 10px', boxSizing: 'border-box',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm, 4px)', background: '#fff',
};
const label: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, margin: '10px 0 5px' };
const box: React.CSSProperties = {
  background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)', padding: '18px 20px',
};
const go = (disabled: boolean): React.CSSProperties => ({
  fontFamily: 'inherit', fontSize: '13.5px', fontWeight: 600, padding: '8px 18px', borderRadius: '999px',
  border: 0, background: 'var(--fgi-blue)', color: '#fff', marginTop: '14px',
  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
});

export default function ContentCreate({ nextEpisode }: { nextEpisode: number }) {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [headline, setHeadline] = useState('');
  const [episode, setEpisode] = useState(String(nextEpisode));
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(input: Parameters<typeof createContentAction>[0]) {
    setBusy(input.type); setError(null);
    const result = await createContentAction(input);
    if ('error' in result) { setBusy(null); setError(result.error); return; }
    // Already there (a second click, or that month was loaded earlier): open
    // the existing item rather than pretend a new one was made.
    router.push(`/admin/content/${result.id}${result.existed ? '?existing=1' : ''}`);
  }

  return (
    <>
      {error && (
        <div role="alert" style={{ ...box, padding: '10px 16px', marginBottom: '14px', background: '#fdecec', borderColor: '#f0c2be', color: '#b3261e', fontSize: '14px' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        <form
          style={{ ...box, borderLeft: '4px solid #8b6f00' }}
          onSubmit={(e) => { e.preventDefault(); create({ type: 'newsletter', month, year: Number(year), headline }); }}
        >
          <div style={{ fontWeight: 700, fontSize: '16px' }}>Add a newsletter</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div>
              <label style={label} htmlFor="n-month">Issue month</label>
              <select id="n-month" style={input} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="n-year">Year</label>
              <input id="n-year" type="number" style={{ ...input, width: '90px' }} value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
          <label style={label} htmlFor="n-head">Headline <span style={{ fontWeight: 400 }}>(optional — the assistant can read it off the PDF)</span></label>
          <input id="n-head" style={{ ...input, width: '100%' }} value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={200} />
          <button type="submit" style={go(busy !== null)} disabled={busy !== null}>
            {busy === 'newsletter' ? 'Creating…' : 'Start draft'}
          </button>
        </form>

        <form
          style={{ ...box, borderLeft: '4px solid #204f64' }}
          onSubmit={(e) => { e.preventDefault(); create({ type: 'podcast', episode: Number(episode), title }); }}
        >
          <div style={{ fontWeight: 700, fontSize: '16px' }}>Add a podcast episode</div>
          <label style={label} htmlFor="p-ep">Episode number</label>
          <input id="p-ep" type="number" min={1} style={{ ...input, width: '90px' }} value={episode} onChange={(e) => setEpisode(e.target.value)} />
          <label style={label} htmlFor="p-title">Episode title <span style={{ fontWeight: 400 }}>(without “Episode {episode || 'N'}:”)</span></label>
          <input id="p-title" style={{ ...input, width: '100%' }} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={250} />
          <button type="submit" style={go(busy !== null)} disabled={busy !== null}>
            {busy === 'podcast' ? 'Creating…' : 'Start draft'}
          </button>
        </form>
      </div>
    </>
  );
}
