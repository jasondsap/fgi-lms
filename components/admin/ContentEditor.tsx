'use client';
// =============================================================================
// /admin/content/<id> — the editor for one newsletter or podcast episode
// (11-19-26). Everything on screen is local state until Save; Publish is a
// separate, explicit step. The AI buttons only ever fill or suggest fields
// here — they never save.
// =============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  confirmFileAction, presignFileAction, presignImageAction,
  saveContentAction, setPublishedAction,
} from '@/components/admin/content-actions';
import { audioMinutes, fitImage, putToS3, squareCrop } from '@/components/admin/content-upload';
import type {
  ContentItem, ContentSaveInput, GuestInput, PinOption,
} from '@/lib/admin-content-shared';
import {
  AUDIENCE_TAG_LABELS, RESOURCE_TYPE_LABELS, TOPIC_TAG_LABELS, type ResourceType,
} from '@/types';

interface PresenterOption {
  id: string; name: string; credentials: string | null; title: string | null;
  bio: string | null; photo_url: string | null; org_name: string | null;
  org_logo_url: string | null; org_url: string | null;
}

interface Suggestion {
  headline?: string; description?: string;
  audience_tags: string[]; topic_tags: string[]; keywords: string[];
}

const EMPTY_GUEST: GuestInput = {
  id: null, name: '', credentials: '', title: '', bio: '',
  photo_url: '', org_name: '', org_logo_url: '', org_url: '',
};

const toGuest = (p: PresenterOption): GuestInput => ({
  id: p.id, name: p.name, credentials: p.credentials ?? '', title: p.title ?? '',
  bio: p.bio ?? '', photo_url: p.photo_url ?? '', org_name: p.org_name ?? '',
  org_logo_url: p.org_logo_url ?? '', org_url: p.org_url ?? '',
});

// --- shared inline styles (design tokens from app/globals.css) ---------------
const card: React.CSSProperties = {
  background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)', padding: '20px 22px', marginBottom: '16px',
};
const h2: React.CSSProperties = { fontSize: '16px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 4px' };
const hint: React.CSSProperties = { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' };
const label: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-body-dark, #2b3640)', margin: '12px 0 5px' };
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '14px',
  padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm, 4px)',
  background: '#fff', color: 'inherit',
};
const btn = (kind: 'primary' | 'plain' | 'go' | 'warn' = 'plain', disabled = false): React.CSSProperties => ({
  fontFamily: 'inherit', fontSize: '13.5px', fontWeight: 600, padding: '8px 16px',
  borderRadius: '999px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
  border: kind === 'plain' ? '1px solid var(--border-color)' : '1px solid transparent',
  background: kind === 'primary' ? 'var(--fgi-blue)' : kind === 'go' ? '#2e7d4f' : kind === 'warn' ? '#fff' : '#fff',
  color: kind === 'primary' || kind === 'go' ? '#fff' : kind === 'warn' ? '#b3261e' : 'var(--fgi-navy)',
  ...(kind === 'warn' ? { border: '1px solid #e6b8b4' } : {}),
});
const pill = (bg: string, fg: string): React.CSSProperties => ({
  background: bg, color: fg, fontSize: '12px', fontWeight: 700, padding: '3px 11px',
  borderRadius: '999px', whiteSpace: 'nowrap',
});

export default function ContentEditor({
  item, pins: initialPins, pinOptions, presenters, guestId,
}: {
  item: ContentItem;
  pins: string[];
  pinOptions: PinOption[];
  presenters: PresenterOption[];
  guestId: string | null;
}) {
  const router = useRouter();
  const isPodcast = item.type === 'podcast';
  const fileWord = isPodcast ? 'MP3' : 'PDF';

  // --- form state ------------------------------------------------------------
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [date, setDate] = useState(item.published_date);
  const [duration, setDuration] = useState(item.duration_minutes ? String(item.duration_minutes) : '');
  const [audience, setAudience] = useState<string[]>(item.audience_tags);
  const [topics, setTopics] = useState<string[]>(item.topic_tags);
  const [keywords, setKeywords] = useState(item.search_keywords.join(', '));
  const [internal, setInternal] = useState(item.internal);
  const [pins, setPins] = useState<string[]>(initialPins);

  const startGuest = presenters.find((p) => p.id === guestId);
  const [guestMode, setGuestMode] = useState<'none' | 'new' | 'existing'>(startGuest ? 'existing' : 'none');
  const [guest, setGuest] = useState<GuestInput>(startGuest ? toGuest(startGuest) : EMPTY_GUEST);

  const [published, setPublished] = useState(item.published);
  const [hasFile, setHasFile] = useState(item.has_file);

  // --- activity state --------------------------------------------------------
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [notes, setNotes] = useState('');
  const [crop, setCrop] = useState<{ file: File; focus: number; preview: string } | null>(null);

  const payload = useMemo<ContentSaveInput>(() => ({
    title, description, published_date: date,
    duration_minutes: isPodcast && duration.trim() ? Number(duration) : null,
    audience_tags: audience, topic_tags: topics,
    search_keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
    internal, pins,
    ...(isPodcast ? { guest: guestMode === 'none' ? null : guest } : {}),
  }), [title, description, date, duration, audience, topics, keywords, internal, pins, guest, guestMode, isPodcast]);

  const serialized = JSON.stringify(payload);
  const saved = useRef(serialized);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setDirty(serialized !== saved.current); }, [serialized]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const say = (kind: 'ok' | 'error', text: string) => setNotice({ kind, text });
  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  // --- save / publish --------------------------------------------------------
  async function save(): Promise<boolean> {
    if (payload.duration_minutes !== null && !Number.isInteger(payload.duration_minutes)) {
      say('error', 'Length must be a whole number of minutes.');
      return false;
    }
    setBusy('save');
    const snapshot = serialized;
    const result = await saveContentAction(item.id, payload);
    setBusy(null);
    if ('error' in result) { say('error', result.error); return false; }
    saved.current = snapshot;
    setDirty(serialized !== snapshot);
    say('ok', published ? 'Saved — the live page is updated.' : 'Draft saved.');
    router.refresh();
    return true;
  }

  async function publish(next: boolean) {
    if (next && dirty && !(await save())) return;
    setBusy('publish');
    const result = await setPublishedAction(item.id, next);
    setBusy(null);
    if ('error' in result) { say('error', result.error); return; }
    setPublished(next);
    say('ok', next
      ? 'Published — it is live in the library now.'
      : 'Unpublished — it is hidden from the library. Nothing was deleted.');
    router.refresh();
  }

  // --- file upload -----------------------------------------------------------
  async function uploadFile(file: File) {
    const okType = isPodcast
      ? /\.mp3$/i.test(file.name)
      : file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!okType) { say('error', `Choose ${isPodcast ? 'an MP3' : 'a PDF'} file.`); return; }
    setBusy('file'); setProgress(0); setNotice(null);
    try {
      const signed = await presignFileAction(item.id);
      if ('error' in signed) throw new Error(signed.error);
      await putToS3(signed.url, file, signed.contentType, setProgress);
      const confirmed = await confirmFileAction(item.id);
      if ('error' in confirmed) throw new Error(confirmed.error);
      setHasFile(true);
      if (isPodcast) {
        const minutes = await audioMinutes(file);
        if (minutes) setDuration(String(minutes));
      }
      say('ok', `${fileWord} uploaded (${(confirmed.size / 1024 / 1024).toFixed(1)} MB).` +
        (published ? ' The live page now serves the new file.' : ''));
      router.refresh();
    } catch (e: any) {
      say('error', e?.message || 'Upload failed.');
    } finally {
      setBusy(null); setProgress(null);
    }
  }

  async function uploadImage(kind: 'photo' | 'logo', blob: Blob) {
    setBusy(kind); setNotice(null);
    try {
      const signed = await presignImageAction(kind, blob.type);
      if ('error' in signed) throw new Error(signed.error);
      await putToS3(signed.url, blob, blob.type);
      setGuest((g) => ({ ...g, [kind === 'photo' ? 'photo_url' : 'org_logo_url']: signed.path }));
    } catch (e: any) {
      say('error', e?.message || 'Image upload failed.');
    } finally {
      setBusy(null);
    }
  }

  async function useCrop() {
    if (!crop) return;
    try {
      const blob = await squareCrop(crop.file, crop.focus);
      URL.revokeObjectURL(crop.preview);
      setCrop(null);
      await uploadImage('photo', blob);
    } catch (e: any) {
      say('error', e?.message || 'Could not process that image.');
    }
  }

  // --- AI helpers ------------------------------------------------------------
  async function ask(body: Record<string, unknown>): Promise<any | null> {
    setNotice(null);
    try {
      const res = await fetch('/api/admin/content/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { say('error', data.error || 'The assistant is unavailable.'); return null; }
      return data;
    } catch {
      say('error', 'The assistant is unavailable.');
      return null;
    }
  }

  async function suggest() {
    setBusy('suggest');
    const data = await ask(isPodcast
      ? { mode: 'podcast-tags', title, description }
      : { mode: 'newsletter', id: item.id });
    setBusy(null);
    if (data) setSuggestion(data);
  }

  async function extract() {
    setBusy('extract');
    const data = await ask({ mode: 'podcast-extract', text: notes });
    setBusy(null);
    if (!data) return;
    const filled: string[] = [];
    if (data.title) {
      const n = item.slug.match(/episode-(\d+)$/)?.[1];
      setTitle(n ? `Episode ${n}: ${data.title}` : data.title); filled.push('title');
    }
    if (data.release_date) { setDate(data.release_date); filled.push('release date'); }
    if (data.duration_minutes) { setDuration(String(data.duration_minutes)); filled.push('length'); }
    if (data.description) { setDescription(data.description); filled.push('description'); }
    if (data.guest?.name) {
      const known = presenters.find((p) => p.name.toLowerCase() === data.guest.name.toLowerCase());
      const base = known ? toGuest(known) : EMPTY_GUEST;
      // For someone already on file, the notes only fill what is blank.
      const pick = (current: string, found: string) => (known && current ? current : found || current);
      setGuestMode(known ? 'existing' : 'new');
      setGuest({
        ...base, name: known ? base.name : data.guest.name,
        credentials: pick(base.credentials, data.guest.credentials),
        title: pick(base.title, data.guest.title),
        org_name: pick(base.org_name, data.guest.org_name),
        org_url: pick(base.org_url, data.guest.org_url),
        bio: pick(base.bio, data.guest.bio),
      });
      filled.push(known ? 'guest (already on file)' : 'guest');
    }
    say(filled.length ? 'ok' : 'error', filled.length
      ? `Filled in: ${filled.join(', ')}. Check each one, then Save.`
      : 'Nothing usable was found in those notes.');
  }

  function applyHeadline(headline: string) {
    // Keep the "Month YYYY" the item was created with; only the headline moves.
    const prefix = title.match(/^([A-Z][a-z]+ \d{4}):/)?.[1]
      ?? title.match(/^RCOE ([A-Z][a-z]+ \d{4}) Newsletter$/)?.[1];
    setTitle(prefix ? `${prefix}: ${headline}` : headline);
  }

  // --- render ----------------------------------------------------------------
  const pinGroups = useMemo(() => {
    const groups = new Map<string, PinOption[]>();
    for (const option of pinOptions) {
      groups.set(option.type, [...(groups.get(option.type) ?? []), option]);
    }
    return [...groups.entries()];
  }, [pinOptions]);

  const descLength = description.length;
  const working = busy !== null;

  return (
    <div>
      {/* Status bar */}
      <div style={{
        ...card, position: 'sticky', top: '8px', zIndex: 5, display: 'flex', alignItems: 'center',
        gap: '10px', flexWrap: 'wrap', padding: '12px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      }}>
        <span style={pill('#eef1f3', '#5f6e7c')}>{RESOURCE_TYPE_LABELS[item.type as ResourceType]}</span>
        <span style={published ? pill('#e3f3e8', '#1f6b3a') : pill('#fdf3dd', '#8a6410')}>
          {published ? 'Published' : 'Draft'}
        </span>
        {item.course_code && (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ID: {item.course_code}</span>
        )}
        {dirty && <span style={{ fontSize: '13px', color: '#8a6410', fontWeight: 600 }}>Unsaved changes</span>}
        <span style={{ flex: 1 }} />
        <a
          href={`/resource/${item.slug}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fgi-blue)' }}
        >
          {published ? 'View page' : 'Preview page'}
        </a>
        <button type="button" style={btn('primary', working || !dirty)} disabled={working || !dirty} onClick={save}>
          {busy === 'save' ? 'Saving…' : 'Save'}
        </button>
        {published ? (
          <button type="button" style={btn('warn', working)} disabled={working} onClick={() => publish(false)}>
            {busy === 'publish' ? 'Working…' : 'Unpublish'}
          </button>
        ) : (
          <button type="button" style={btn('go', working)} disabled={working} onClick={() => publish(true)}>
            {busy === 'publish' ? 'Publishing…' : dirty ? 'Save & publish' : 'Publish'}
          </button>
        )}
      </div>

      {notice && (
        <div role="status" style={{
          ...card, padding: '10px 16px', fontSize: '14px',
          background: notice.kind === 'ok' ? '#eef8f1' : '#fdecec',
          borderColor: notice.kind === 'ok' ? '#bfe0c9' : '#f0c2be',
          color: notice.kind === 'ok' ? '#1f6b3a' : '#b3261e',
        }}>
          {notice.text}
        </div>
      )}

      {/* 1. File */}
      <section style={card}>
        <h2 style={h2}>1. {isPodcast ? 'Episode audio' : 'Newsletter PDF'}</h2>
        <p style={hint}>
          {hasFile
            ? <>A {fileWord} is on file. Choosing another one replaces it{published ? ' on the live page straight away' : ''}.</>
            : <>Choose the {fileWord}. It uploads straight away; nothing is public until you publish.</>}
          {isPodcast && ' Only MP3 — not the MP4 made for social.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <input
            type="file" accept={isPodcast ? '.mp3,audio/mpeg' : '.pdf,application/pdf'}
            disabled={working}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadFile(f); }}
          />
          {hasFile && item.file_url && progress === null && (
            <a href={item.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13.5px', color: 'var(--fgi-blue)' }}>
              Open current {fileWord}
            </a>
          )}
        </div>
        {progress !== null && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ height: '8px', background: '#e6eaee', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: 'var(--fgi-blue)', transition: 'width 0.2s' }} />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '5px' }}>
              Uploading… {Math.round(progress * 100)}% — keep this page open.
            </div>
          </div>
        )}
      </section>

      {/* Podcast: fill from notes */}
      {isPodcast && (
        <section style={card}>
          <h2 style={h2}>Fill in from the episode notes <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(optional)</span></h2>
          <p style={hint}>
            Paste the whole information sheet for the episode and the assistant will copy the title, release date,
            length, description and guest details into the form below. It copies your wording — it doesn&#39;t rewrite it,
            and it won&#39;t invent a bio that isn&#39;t there.
          </p>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}
            placeholder="Paste the episode information here…" style={{ ...input, resize: 'vertical' }}
          />
          <div style={{ marginTop: '10px' }}>
            <button type="button" style={btn('plain', working || !notes.trim())} disabled={working || !notes.trim()} onClick={extract}>
              {busy === 'extract' ? 'Reading…' : 'Fill in the form'}
            </button>
          </div>
        </section>
      )}

      {/* 2. Details */}
      <section style={card}>
        <h2 style={h2}>2. Details</h2>
        <label style={label} htmlFor="c-title">Title</label>
        <input id="c-title" style={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} />
        {!isPodcast && (
          <p style={{ ...hint, margin: '5px 0 0' }}>House style: “{title.match(/^[A-Z][a-z]+ \d{4}/)?.[0] ?? 'Month Year'}: Main headline of the issue”.</p>
        )}

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={label} htmlFor="c-date">{isPodcast ? 'Release date' : 'Date added'}</label>
            <input id="c-date" type="date" style={{ ...input, width: 'auto' }} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {isPodcast && (
            <div>
              <label style={label} htmlFor="c-min">Length (minutes)</label>
              <input
                id="c-min" type="number" min={1} max={999} style={{ ...input, width: '110px' }}
                value={duration} onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          )}
        </div>
        <p style={{ ...hint, margin: '5px 0 0' }}>
          The library lists newest first by this date, and the home page “latest” tile follows the newest {isPodcast ? 'episode' : 'item'}.
          {isPodcast && ' Length fills in by itself when you upload the MP3.'}
        </p>

        <label style={label} htmlFor="c-desc">Description</label>
        <textarea
          id="c-desc" style={{ ...input, resize: 'vertical' }} rows={isPodcast ? 9 : 4}
          value={description} onChange={(e) => setDescription(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '5px' }}>
          <span>
            {isPodcast
              ? 'Shown on the episode page; start a new line for each paragraph.'
              : 'Shown on the library card and used by search — a sentence or two on who is featured and what the issue covers.'}
          </span>
          <span>{descLength} characters</span>
        </div>
      </section>

      {/* 3. Tags */}
      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={h2}>3. Filters &amp; search</h2>
            <p style={hint}>These decide which filter-bar checkboxes find this item.</p>
          </div>
          <button
            type="button" onClick={suggest}
            style={btn('plain', working || (!isPodcast && !hasFile))}
            disabled={working || (!isPodcast && !hasFile)}
            title={!isPodcast && !hasFile ? 'Upload the PDF first' : undefined}
          >
            {busy === 'suggest'
              ? (isPodcast ? 'Thinking…' : 'Reading the PDF…')
              : (isPodcast ? '✨ Suggest tags' : '✨ Suggest from the PDF')}
          </button>
        </div>

        {suggestion && (
          <div style={{ background: '#f4f8fb', border: '1px solid #cfe1ec', borderRadius: 'var(--radius-md)', padding: '14px 16px', margin: '4px 0 14px', fontSize: '14px' }}>
            <div style={{ fontWeight: 700, color: 'var(--fgi-navy)', marginBottom: '8px' }}>
              Suggestions — nothing changes until you choose “Use”.
            </div>
            {suggestion.headline && (
              <SuggestRow label="Headline" onUse={() => applyHeadline(suggestion.headline!)}>{suggestion.headline}</SuggestRow>
            )}
            {suggestion.description && (
              <SuggestRow label={`Description (${suggestion.description.length} characters)`} onUse={() => setDescription(suggestion.description!)}>
                {suggestion.description}
              </SuggestRow>
            )}
            <SuggestRow label="I am a…" onUse={() => setAudience(suggestion.audience_tags)}>
              {suggestion.audience_tags.map((t) => AUDIENCE_TAG_LABELS[t as keyof typeof AUDIENCE_TAG_LABELS]).join(' · ') || 'None — written for everyone'}
            </SuggestRow>
            <SuggestRow label="I want to learn about…" onUse={() => setTopics(suggestion.topic_tags)}>
              {suggestion.topic_tags.map((t) => TOPIC_TAG_LABELS[t as keyof typeof TOPIC_TAG_LABELS]).join(' · ') || 'None'}
            </SuggestRow>
            {suggestion.keywords.length > 0 && (
              <SuggestRow label="Search keywords" onUse={() => setKeywords(suggestion.keywords.join(', '))}>
                {suggestion.keywords.join(', ')}
              </SuggestRow>
            )}
            <button type="button" style={{ ...btn('plain'), marginTop: '6px' }} onClick={() => setSuggestion(null)}>Dismiss</button>
          </div>
        )}

        <TagGroup title="I am a…" labels={AUDIENCE_TAG_LABELS} selected={audience} onToggle={(v) => toggle(audience, setAudience, v)} />
        <TagGroup title="I want to learn about…" labels={TOPIC_TAG_LABELS} selected={topics} onToggle={(v) => toggle(topics, setTopics, v)} />

        <label style={label} htmlFor="c-kw">Extra search keywords <span style={{ fontWeight: 400 }}>(optional, separated by commas)</span></label>
        <input id="c-kw" style={input} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. dual diagnosis, MAT, braided funding" />
        <p style={{ ...hint, margin: '5px 0 0' }}>Words people might search for that aren&#39;t in the title or description.</p>
      </section>

      {/* Guest */}
      {isPodcast && (
        <section style={card}>
          <h2 style={h2}>4. Guest</h2>
          <p style={hint}>Shown under the player. Tony White, as host, is already on every episode.</p>
          <select
            style={{ ...input, width: 'auto', maxWidth: '100%' }}
            value={guestMode === 'existing' ? guest.id ?? '' : guestMode}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'none') { setGuestMode('none'); setGuest(EMPTY_GUEST); }
              else if (v === 'new') { setGuestMode('new'); setGuest(EMPTY_GUEST); }
              else {
                const p = presenters.find((x) => x.id === v);
                if (p) { setGuestMode('existing'); setGuest(toGuest(p)); }
              }
            }}
          >
            <option value="none">No guest</option>
            <option value="new">New guest…</option>
            <optgroup label="Already on file">
              {presenters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          </select>

          {guestMode !== 'none' && (
            <>
              {guestMode === 'existing' && (
                <p style={{ ...hint, margin: '10px 0 0', color: '#8a6410' }}>
                  This person is already on file. Edits here change them everywhere they appear, including webinars.
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 16px' }}>
                <Field id="g-name" label="Name" value={guest.name} onChange={(v) => setGuest({ ...guest, name: v })} />
                <Field id="g-cred" label="Credentials (optional)" value={guest.credentials} onChange={(v) => setGuest({ ...guest, credentials: v })} placeholder="PhD, LCSW…" />
              </div>
              <Field id="g-title" label="Title and organization, one line" value={guest.title} onChange={(v) => setGuest({ ...guest, title: v })} placeholder="Director of Behavioral Health, The Pew Charitable Trusts" />
              <label style={label} htmlFor="g-bio">Bio</label>
              <textarea id="g-bio" style={{ ...input, resize: 'vertical' }} rows={6} value={guest.bio} onChange={(e) => setGuest({ ...guest, bio: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 16px' }}>
                <Field id="g-org" label="Organization name" value={guest.org_name} onChange={(v) => setGuest({ ...guest, org_name: v })} />
                <Field id="g-url" label="Organization or guest link" value={guest.org_url} onChange={(v) => setGuest({ ...guest, org_url: v })} placeholder="https://…" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginTop: '16px' }}>
                {/* Headshot */}
                <div>
                  <div style={{ ...label, marginTop: 0 }}>Headshot</div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {(crop?.preview || guest.photo_url) ? <img
                      src={crop?.preview || guest.photo_url} alt=""
                      style={{
                        width: '140px', height: '140px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)',
                        objectPosition: crop ? `${crop.focus * 100}% ${crop.focus * 100}%` : undefined,
                      }}
                    /> : <div style={{ width: '140px', height: '140px', borderRadius: '4px', background: 'var(--body-bg)', border: '1px solid var(--border-color)' }} />}
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: 0 }}>
                      {crop ? (
                        <>
                          <div style={{ marginBottom: '6px' }}>Slide until the face is centered in the square.</div>
                          <input
                            type="range" min={0} max={100} value={Math.round(crop.focus * 100)}
                            onChange={(e) => setCrop({ ...crop, focus: Number(e.target.value) / 100 })}
                            style={{ width: '100%' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <button type="button" style={btn('primary', working)} disabled={working} onClick={useCrop}>
                              {busy === 'photo' ? 'Uploading…' : 'Use this crop'}
                            </button>
                            <button type="button" style={btn('plain')} onClick={() => { URL.revokeObjectURL(crop.preview); setCrop(null); }}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            type="file" accept="image/*" disabled={working}
                            onChange={(e) => {
                              const f = e.target.files?.[0]; e.target.value = '';
                              if (f) setCrop({ file: f, focus: 0.3, preview: URL.createObjectURL(f) });
                            }}
                          />
                          <div style={{ marginTop: '6px' }}>Any photo — it is cropped square and resized for you.</div>
                          {guest.photo_url && (
                            <button type="button" style={{ ...btn('plain'), marginTop: '8px' }} onClick={() => setGuest({ ...guest, photo_url: '' })}>Remove</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div>
                  <div style={{ ...label, marginTop: 0 }}>Organization logo (optional)</div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '180px', height: '80px', border: '1px solid var(--border-color)', borderRadius: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', flexShrink: 0,
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {guest.org_logo_url && <img src={guest.org_logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: 0 }}>
                      <input
                        type="file" accept="image/*" disabled={working}
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; e.target.value = '';
                          if (!f) return;
                          try { await uploadImage('logo', await fitImage(f)); }
                          catch { say('error', 'Could not process that image. Try a PNG or JPG.'); }
                        }}
                      />
                      <div style={{ marginTop: '6px' }}>
                        {busy === 'logo' ? 'Uploading…' : 'It sits on a white card, so a white-only logo will not show.'}
                      </div>
                      {guest.org_logo_url && (
                        <button type="button" style={{ ...btn('plain'), marginTop: '8px' }} onClick={() => setGuest({ ...guest, org_logo_url: '' })}>Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Related */}
      <section style={card}>
        <h2 style={h2}>{isPodcast ? '5' : '4'}. Goes with…</h2>
        <p style={hint}>
          Tick this month&#39;s companions — the webinar, the newsletter, the podcast episode. Each one then lists the
          others first under “Related”. You can come back and tick one that isn&#39;t loaded yet.
        </p>
        <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm, 4px)', padding: '6px 12px 10px' }}>
          {pinGroups.map(([type, options]) => (
            <div key={type}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', margin: '10px 0 4px' }}>
                {RESOURCE_TYPE_LABELS[type as ResourceType] ?? type}s
              </div>
              {options.map((o) => (
                <label key={o.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '14px', padding: '3px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={pins.includes(o.id)} onChange={() => toggle(pins, setPins, o.id)} style={{ marginTop: '3px' }} />
                  <span>
                    {o.title}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}> — {o.published_date}{o.published ? '' : ' · draft'}</span>
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Visibility */}
      <section style={card}>
        <h2 style={h2}>{isPodcast ? '6' : '5'}. Who can see it</h2>
        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} style={{ marginTop: '3px' }} />
          <span>
            <strong>Internal — FGI staff and admins only.</strong>
            <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Leave unticked for a normal public item in the FGI library. It does not appear on the Colorado or SCARR portals either way.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}

function Field({ id, label: text, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={label} htmlFor={id}>{text}</label>
      <input id={id} style={input} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TagGroup({ title, labels, selected, onToggle }: {
  title: string; labels: Record<string, string>; selected: string[]; onToggle: (value: string) => void;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 6px' }}>
      <legend style={{ ...label, padding: 0 }}>{title}</legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '4px 16px' }}>
        {Object.entries(labels).map(([value, text]) => (
          <label key={value} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} style={{ marginTop: '3px' }} />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SuggestRow({ label: text, onUse, children }: {
  label: string; onUse: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '7px 0', borderTop: '1px solid #dfeaf1' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>{text}</div>
        <div>{children}</div>
      </div>
      <button type="button" onClick={onUse} style={{ ...btn('plain'), padding: '5px 13px', flexShrink: 0 }}>Use</button>
    </div>
  );
}
