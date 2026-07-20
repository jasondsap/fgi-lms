'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  RESOURCE_TYPE_LABELS, AUDIENCE_TAG_LABELS, TOPIC_TAG_LABELS, DURATION_LABELS,
  type ResourceType, type AudienceTag, type TopicTag,
} from '@/types';

interface Props { total: number; targetPath?: string; }

/**
 * Accordion filter group. Collapsed by default (per Jennifer's 7-18-26 mockup);
 * a group that already has an active filter opens itself so the selection stays
 * visible after the filter navigation re-renders the sidebar.
 */
function FilterGroup({
  title, defaultOpen = false, children,
}: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: '1px solid var(--border-color)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', gap: '8px', background: 'none', border: 'none',
          padding: '13px 0', textAlign: 'left', fontFamily: 'inherit',
          fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)',
        }}
      >
        {title}
        <svg
          width="18" height="11" viewBox="0 0 18 11" aria-hidden="true"
          style={{
            flexShrink: 0, transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <path d="M1 1l8 8 8-8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {open && <div style={{ paddingBottom: '12px' }}>{children}</div>}
    </div>
  );
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: '7px', cursor: 'pointer',
      marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.35,
    }}>
      <input type="checkbox" checked={checked} onChange={onChange}
        style={{ marginTop: '2px', accentColor: 'var(--fgi-blue)', flexShrink: 0 }} />
      {label}
    </label>
  );
}

export default function FilterSidebar({ total, targetPath }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dest = targetPath || pathname;

  const toggle = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(key);
    params.delete(key);
    if (current.includes(value)) {
      current.filter(v => v !== value).forEach(v => params.append(key, v));
    } else {
      [...current, value].forEach(v => params.append(key, v));
    }
    params.set('page', '1');
    router.push(`${dest}?${params.toString()}`);
  }, [router, dest, searchParams]);

  const setParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) { params.delete(key); } else { params.set(key, value); }
    params.set('page', '1');
    router.push(`${dest}?${params.toString()}`);
  }, [router, dest, searchParams]);

  const clearAll = useCallback(() => { router.push(dest); }, [router, dest]);

  const activeTypes    = searchParams.getAll('type') as ResourceType[];
  const activeAudience = searchParams.getAll('audience') as AudienceTag[];
  const activeTopics   = searchParams.getAll('topic') as TopicTag[];
  const activeDuration = searchParams.get('duration');
  const activeMatch    = searchParams.get('match') || 'any';
  const hasFilters     = activeTypes.length || activeAudience.length || activeTopics.length || activeDuration;

  return (
    <aside style={{
      width: '252px', flexShrink: 0, background: 'var(--card-bg)',
      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
      padding: '1.15rem 1.25rem', position: 'sticky', top: '110px',
      maxHeight: 'calc(100vh - 130px)', overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: '8px', marginBottom: '6px',
      }}>
        <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> results
        </span>
        {hasFilters ? (
          <button onClick={clearAll} style={{
            fontSize: '11px', color: 'var(--fgi-blue)', background: 'none',
            border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline',
            flexShrink: 0,
          }}>Clear all</button>
        ) : null}
      </div>

      <FilterGroup title="Resource Type" defaultOpen={activeTypes.length > 0}>
        {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map(type => (
          <CheckItem key={type} label={RESOURCE_TYPE_LABELS[type]}
            checked={activeTypes.includes(type)} onChange={() => toggle('type', type)} />
        ))}
      </FilterGroup>

      <FilterGroup title="I Am A…" defaultOpen={activeAudience.length > 0}>
        {(Object.keys(AUDIENCE_TAG_LABELS) as AudienceTag[]).map(tag => (
          <CheckItem key={tag} label={AUDIENCE_TAG_LABELS[tag]}
            checked={activeAudience.includes(tag)} onChange={() => toggle('audience', tag)} />
        ))}
      </FilterGroup>

      <FilterGroup title="I Want To Learn About…" defaultOpen={activeTopics.length > 0}>
        {(Object.keys(TOPIC_TAG_LABELS) as TopicTag[]).map(tag => (
          <CheckItem key={tag} label={TOPIC_TAG_LABELS[tag]}
            checked={activeTopics.includes(tag)} onChange={() => toggle('topic', tag)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Length" defaultOpen={Boolean(activeDuration)}>
        {(Object.keys(DURATION_LABELS) as Array<keyof typeof DURATION_LABELS>).map(key => (
          <CheckItem key={key} label={DURATION_LABELS[key]}
            checked={activeDuration === key}
            onChange={() => setParam('duration', activeDuration === key ? null : key)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Match Categories" defaultOpen={activeMatch === 'all'}>
        {['any', 'all'].map(val => (
          <label key={val} style={{
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '5px',
          }}>
            <input type="radio" name="match" value={val} checked={activeMatch === val}
              onChange={() => setParam('match', val)}
              style={{ accentColor: 'var(--fgi-blue)' }} />
            {val === 'any' ? 'Match Any Category' : 'Match All Categories'}
          </label>
        ))}
      </FilterGroup>
    </aside>
  );
}
