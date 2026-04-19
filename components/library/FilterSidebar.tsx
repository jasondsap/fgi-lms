'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import {
  RESOURCE_TYPE_LABELS,
  AUDIENCE_TAG_LABELS,
  TOPIC_TAG_LABELS,
  DURATION_LABELS,
  type ResourceType,
  type AudienceTag,
  type TopicTag,
} from '@/types';

interface Props {
  total: number;
  targetPath?: string; // defaults to current path
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 700,
        marginBottom: '8px',
        color: 'var(--text-primary)',
        letterSpacing: '-0.01em',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function CheckItem({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '7px',
      cursor: 'pointer',
      marginBottom: '5px',
      fontSize: '13px',
      color: 'var(--text-secondary)',
      lineHeight: 1.35,
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ marginTop: '2px', accentColor: 'var(--fgi-blue)', flexShrink: 0 }}
      />
      {label}
    </label>
  );
}

export default function FilterSidebar({ total, targetPath }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const dest         = targetPath || pathname;

  const toggle = useCallback((key: string, value: string) => {
    const params  = new URLSearchParams(searchParams.toString());
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

  const clearAll = useCallback(() => {
    router.push(dest);
  }, [router, dest]);

  const activeTypes    = searchParams.getAll('type')     as ResourceType[];
  const activeAudience = searchParams.getAll('audience') as AudienceTag[];
  const activeTopics   = searchParams.getAll('topic')    as TopicTag[];
  const activeDuration = searchParams.get('duration');
  const activeMatch    = searchParams.get('match') || 'any';
  const hasFilters     = activeTypes.length || activeAudience.length || activeTopics.length || activeDuration;

  return (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      background: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '1rem',
      position: 'sticky',
      top: '80px',    /* clears the sticky header */
      maxHeight: 'calc(100vh - 100px)',
      overflowY: 'auto',
    }}>

      {/* Result count */}
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> results
      </div>

      {/* Filters label + clear */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '10px',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Filters
        </span>
        {hasFilters ? (
          <button onClick={clearAll} style={{
            fontSize: '11px', color: 'var(--fgi-blue)', background: 'none',
            border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline',
          }}>
            Clear all
          </button>
        ) : (
          /* filter icon placeholder */
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1 }}>⊟</span>
        )}
      </div>

      {/* Match mode */}
      <div style={{ marginBottom: '1.1rem' }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)',
          marginBottom: '5px',
        }}>
          <input type="radio" name="match" value="any" checked={activeMatch === 'any'}
            onChange={() => setParam('match', 'any')}
            style={{ accentColor: 'var(--fgi-blue)' }} />
          Match Any Category
        </label>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)',
        }}>
          <input type="radio" name="match" value="all" checked={activeMatch === 'all'}
            onChange={() => setParam('match', 'all')}
            style={{ accentColor: 'var(--fgi-blue)' }} />
          Match All Categories
        </label>
      </div>

      {/* Type */}
      <FilterGroup title="Type">
        {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map(type => (
          <CheckItem
            key={type}
            label={RESOURCE_TYPE_LABELS[type]}
            checked={activeTypes.includes(type)}
            onChange={() => toggle('type', type)}
          />
        ))}
      </FilterGroup>

      {/* Length */}
      <FilterGroup title="Length">
        {(Object.keys(DURATION_LABELS) as Array<keyof typeof DURATION_LABELS>).map(key => (
          <CheckItem
            key={key}
            label={DURATION_LABELS[key]}
            checked={activeDuration === key}
            onChange={() => setParam('duration', activeDuration === key ? null : key)}
          />
        ))}
      </FilterGroup>

      {/* Audience */}
      <FilterGroup title="I am a…">
        {(Object.keys(AUDIENCE_TAG_LABELS) as AudienceTag[]).map(tag => (
          <CheckItem
            key={tag}
            label={AUDIENCE_TAG_LABELS[tag]}
            checked={activeAudience.includes(tag)}
            onChange={() => toggle('audience', tag)}
          />
        ))}
      </FilterGroup>

      {/* Topics */}
      <FilterGroup title="I want to learn about…">
        {(Object.keys(TOPIC_TAG_LABELS) as TopicTag[]).map(tag => (
          <CheckItem
            key={tag}
            label={TOPIC_TAG_LABELS[tag]}
            checked={activeTopics.includes(tag)}
            onChange={() => toggle('topic', tag)}
          />
        ))}
      </FilterGroup>
    </aside>
  );
}
