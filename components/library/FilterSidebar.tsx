'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  RESOURCE_TYPE_LABELS, AUDIENCE_TAG_LABELS, TOPIC_TAG_LABELS, FILTER_GROUPS,
} from '@/types';

interface Props {
  total: number;
  targetPath?: string;
  /** True on a tenant portal — controls the Certification Info group. */
  isTenant?: boolean;
  /**
   * Tenant portals: link to the FGI main library, rendered as an
   * "Other Libraries" block at the foot of the sidebar (Jennifer, 8-25).
   */
  fgiLibraryHref?: string;
}

const LABEL_MAPS: Record<string, Record<string, string>> = {
  type:     RESOURCE_TYPE_LABELS,
  audience: AUDIENCE_TAG_LABELS,
  topic:    TOPIC_TAG_LABELS,
};

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

export default function FilterSidebar({ total, targetPath, isTenant = false, fgiLibraryHref }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dest = targetPath || pathname;

  const toggle = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'collection') {
      // A collection is a single curated view, not a multi-select facet.
      if (params.get('collection') === value) params.delete('collection');
      else params.set('collection', value);
    } else {
      const current = params.getAll(key);
      params.delete(key);
      if (current.includes(value)) {
        current.filter(v => v !== value).forEach(v => params.append(key, v));
      } else {
        [...current, value].forEach(v => params.append(key, v));
      }
    }
    params.set('page', '1');
    // scroll: false keeps the visitor where they are in the library instead
    // of snapping to the top of the page on every filter change.
    router.push(`${dest}?${params.toString()}`, { scroll: false });
  }, [router, dest, searchParams]);

  const clearAll = useCallback(() => { router.push(dest, { scroll: false }); }, [router, dest]);

  const active: Record<string, string[]> = {
    type:       searchParams.getAll('type'),
    audience:   searchParams.getAll('audience'),
    topic:      searchParams.getAll('topic'),
    collection: searchParams.getAll('collection'),
  };
  const hasFilters = active.type.length || active.audience.length || active.topic.length
    || active.collection.length || searchParams.get('duration');

  // Normalise every item to {param, value, label} so a group can mix its own
  // facet with a collection checkbox (the tenants' "Required Videos").
  const groups = FILTER_GROUPS
    .filter(g => (!g.tenantOnly || isTenant) && !(g.hideOnTenant && isTenant))
    .map(g => {
      const labels = LABEL_MAPS[g.param];
      const items = g.items
        .map(i => (typeof i === 'string'
          ? {
              param: g.param, value: i,
              label: (isTenant && g.tenantLabels?.[i]) || g.labels?.[i] || labels[i] || i,
            }
          : i))
        .filter(i => !(isTenant && g.excludeOnTenant?.includes(i.value)));
      return { title: g.title, items };
    })
    .filter(g => g.items.length > 0);

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

      {groups.map(group => (
        <FilterGroup
          key={group.title}
          title={group.title}
          defaultOpen={group.items.some(i => active[i.param].includes(i.value))}
        >
          {group.items.map(item => (
            <CheckItem
              key={`${item.param}:${item.value}`}
              label={item.label}
              checked={active[item.param].includes(item.value)}
              onChange={() => toggle(item.param, item.value)}
            />
          ))}
        </FilterGroup>
      ))}

      {isTenant && fgiLibraryHref && (
        <div style={{ paddingTop: '14px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Other Libraries
          </div>
          <a
            href={fgiLibraryHref}
            style={{ fontSize: '13px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}
          >
            FGI Learning Resource Center library
          </a>
        </div>
      )}
    </aside>
  );
}
